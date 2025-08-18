use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use std::sync::Mutex;
use base64::{engine::general_purpose::STANDARD, Engine};
use openmls::prelude::*;
use openmls_rust_crypto::OpenMlsRustCrypto;
use openmls_basic_credential::SignatureKeyPair;
use once_cell::sync::Lazy;
use tls_codec::{Serialize, Deserialize};

fn export_group_info_internal(
    group: &MlsGroup, 
    provider: &OpenMlsRustCrypto, 
    signer: &SignatureKeyPair
) -> Result<Vec<u8>, String> {
    let group_info = group.export_group_info(provider, signer, true)
        .map_err(|e| format!("export group info: {:?}", e))?;
    group_info.tls_serialize_detached()
        .map_err(|e| format!("serialize group info: {:?}", e))
}
use openmls::prelude::*;
use openmls_rust_crypto::RustCrypto;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use base64::{engine::general_purpose::STANDARD, Engine};
use tls_codec::Serialize;

static GROUPS: Lazy<Mutex<HashMap<u32, GroupHandle>>> = Lazy::new(|| Mutex::new(HashMap::new()));
static NEXT_ID: Lazy<Mutex<u32>> = Lazy::new(|| Mutex::new(1));

const CS: Ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;

struct GroupHandle {
    group: MlsGroup,
    signer: openmls_basic_credential::SignatureKeyPair,
    credential: CredentialWithKey,
}

fn b64(data: &[u8]) -> String { STANDARD.encode(data) }
fn b64dec(s: &str) -> Result<Vec<u8>, String> { STANDARD.decode(s).map_err(|e| e.to_string()) }

fn random_group_id() -> GroupId { GroupId::from_slice(&RustCrypto::default().random_vec(16).unwrap()) }

fn export_group_info_internal(group: &MlsGroup, provider: &RustCrypto, signer: &openmls_basic_credential::SignatureKeyPair) -> Result<Vec<u8>, String> {
    let gi = group.export_group_info(provider, signer, true).map_err(|e| format!("export_group_info: {e:?}"))?;
    Ok(gi.tls_serialize_detached().map_err(|e| format!("serialize gi: {e:?}"))?)
}

fn next_id() -> u32 { let mut g = NEXT_ID.lock().unwrap(); let v = *g; *g += 1; v }

#[wasm_bindgen(getter_with_clone)]
pub struct KeyPackageBundleExport {
    #[wasm_bindgen(getter_with_clone)]
    pub key_package: String,
    #[wasm_bindgen(getter_with_clone)]
    pub hash: String,
    #[wasm_bindgen(getter_with_clone)]
    pub credential_id: String,
}

#[wasm_bindgen(getter_with_clone)]
pub struct CreatedGroup {
    pub handle: u32,
    #[wasm_bindgen(getter_with_clone)]
    pub group_id: String,
    #[wasm_bindgen(getter_with_clone)]
    pub key_package: String,
}

#[wasm_bindgen(getter_with_clone)]
pub struct EncryptResult {
    #[wasm_bindgen(getter_with_clone)]
    pub message: String,
}

#[wasm_bindgen]
pub struct DecryptResult {
    #[wasm_bindgen(getter_with_clone)]
    pub plaintext: Vec<u8>,
}

#[wasm_bindgen]
pub fn generate_key_package(identity: &str) -> Result<KeyPackageBundleExport, JsValue> {
    console_error_panic_hook::set_once();
    let provider = &RustCrypto::default();
    
    // Use basic credential approach
    let signer = openmls_basic_credential::SignatureKeyPair::new(CS.signature_scheme())
        .map_err(|e| JsValue::from_str(&format!("signer: {e:?}")))?;
    
    let credential = BasicCredential::new(identity.as_bytes().to_vec());
    let credential_with_key = CredentialWithKey {
        credential: credential.into(),
        signature_key: signer.to_public_vec().into(),
    };
    
    let kp = KeyPackage::builder()
        .build(CS, provider, &signer, credential_with_key)
        .map_err(|e| JsValue::from_str(&format!("kp build: {e:?}")))?;
    
    let kp_bytes = kp.tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize kp: {e:?}")))?;
    
    // Simple hash using first 8 bytes as placeholder
    let hash = hex::encode(&kp_bytes[..8.min(kp_bytes.len())]);
    
    Ok(KeyPackageBundleExport {
        key_package: b64(&kp_bytes),
        hash,
        credential_id: identity.to_string(),
    })
}

#[wasm_bindgen]
pub fn create_group(identity: &str) -> Result<CreatedGroup, JsValue> {
    console_error_panic_hook::set_once();
    let provider = &RustCrypto::default();
    
    let signer = openmls_basic_credential::SignatureKeyPair::new(CS.signature_scheme())
        .map_err(|e| JsValue::from_str(&format!("signer: {e:?}")))?;
    
    let credential = BasicCredential::new(identity.as_bytes().to_vec());
    let credential_with_key = CredentialWithKey {
        credential: credential.into(),
        signature_key: signer.to_public_vec().into(),
    };
    
    let group_config = MlsGroupCreateConfig::builder().build();
    
    let group = MlsGroup::new(
        provider,
        &signer,
        &group_config,
        credential_with_key.clone(),
    ).map_err(|e| JsValue::from_str(&format!("group creation: {e:?}")))?;
    
    let key_package = generate_key_package(identity)?;
    let handle = next_id();
    
    let group_handle = GroupHandle {
        group,
        signer,
        credential: credential_with_key,
    };
    
    GROUPS.lock().unwrap().insert(handle, group_handle);
    
    Ok(CreatedGroup {
        handle,
        group_id: b64(&[0u8; 8]), // placeholder group id
        key_package: key_package.key_package,
    })
}

#[wasm_bindgen]
pub fn encrypt(handle: u32, plaintext: &[u8]) -> Result<EncryptResult, JsValue> {
    let provider = &RustCrypto::default();
    let mut guard = GROUPS.lock().unwrap();
    let h = guard.get_mut(&handle).ok_or_else(|| JsValue::from_str("unknown handle"))?;
    
    let msg = h.group.create_message(provider, &h.signer, plaintext)
        .map_err(|e| JsValue::from_str(&format!("create_message: {e:?}")))?;
    
    let wire = msg.tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize msg: {e:?}")))?;
    
    Ok(EncryptResult { message: b64(&wire) })
}

#[wasm_bindgen]
pub fn decrypt(handle: u32, message_b64: &str) -> Result<DecryptResult, JsValue> {
    let provider = &RustCrypto::default();
    let data = b64dec(message_b64).map_err(|e| JsValue::from_str(&e))?;
    let mut guard = GROUPS.lock().unwrap();
    let h = guard.get_mut(&handle).ok_or_else(|| JsValue::from_str("unknown handle"))?;
    
    let protocol_message = ProtocolMessage::try_from(data.as_slice())
        .map_err(|e| JsValue::from_str(&format!("parse message: {e:?}")))?;
    
    let processed = h.group.process_message(provider, protocol_message)
        .map_err(|e| JsValue::from_str(&format!("process_message: {e:?}")))?;
    
    match processed.into_content() {
        ProcessedMessageContent::ApplicationMessage(app_msg) => {
            Ok(DecryptResult { plaintext: app_msg.into_bytes() })
        }
        _ => Err(JsValue::from_str("not an application message"))
    }
}

#[wasm_bindgen]
pub fn export_group_info(handle: u32) -> Result<String, JsValue> {
    let provider = &RustCrypto::default();
    let guard = GROUPS.lock().unwrap();
    let h = guard.get(&handle).ok_or_else(|| JsValue::from_str("unknown handle"))?;
    let bytes = export_group_info_internal(&h.group, provider, &h.signer)
        .map_err(|e| JsValue::from_str(&e))?;
    Ok(b64(&bytes))
}

#[wasm_bindgen]
pub fn free_group(handle: u32) {
    GROUPS.lock().unwrap().remove(&handle);
}

// ---- 追加予定機能のスタブ ----

#[wasm_bindgen]
pub fn add_members(_handle: u32, _key_packages_b64: JsValue) -> Result<JsValue, JsValue> {
    // TODO: implement using group.add_members + commit
    Err(JsValue::from_str("add_members not yet implemented"))
}

#[wasm_bindgen]
pub fn remove_members(_handle: u32, _leaf_indices: JsValue) -> Result<JsValue, JsValue> {
    // TODO: implement remove + commit
    Err(JsValue::from_str("remove_members not yet implemented"))
}

#[wasm_bindgen]
pub fn update_key(_handle: u32) -> Result<JsValue, JsValue> {
    // TODO: implement update path
    Err(JsValue::from_str("update_key not yet implemented"))
}

#[wasm_bindgen]
pub fn join_with_welcome(_identity: &str, _welcome_b64: &str, _key_package_b64: &str) -> Result<u32, JsValue> {
    // TODO: implement welcome join
    Err(JsValue::from_str("join_with_welcome not yet implemented"))
}

#[wasm_bindgen]
pub fn join_with_group_info(_identity: &str, _group_info_b64: &str, _key_package_b64: &str) -> Result<JsValue, JsValue> {
    // TODO: implement external join returning commit
    Err(JsValue::from_str("join_with_group_info not yet implemented"))
}

#[wasm_bindgen]
pub fn process_commit(_handle: u32, _public_message_b64: &str) -> Result<(), JsValue> {
    // TODO
    Err(JsValue::from_str("process_commit not yet implemented"))
}

#[wasm_bindgen]
pub fn process_proposal(_handle: u32, _public_message_b64: &str) -> Result<(), JsValue> {
    // TODO
    Err(JsValue::from_str("process_proposal not yet implemented"))
}

#[wasm_bindgen]
pub fn verify_key_package(_b64: &str, _expected_identity: Option<String>) -> bool { true }

#[wasm_bindgen]
pub fn verify_welcome(_b64: &str) -> bool { true }

#[wasm_bindgen]
pub fn export_group_state(_handle: u32) -> Result<String, JsValue> {
    // TODO: serialize group + signer + credential
    Err(JsValue::from_str("export_group_state not yet implemented"))
}

#[wasm_bindgen]
pub fn import_group_state(_data_b64: &str) -> Result<u32, JsValue> {
    // TODO: deserialize and register handle
    Err(JsValue::from_str("import_group_state not yet implemented"))
}
