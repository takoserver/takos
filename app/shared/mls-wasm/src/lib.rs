use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use std::sync::Mutex;
use base64::{engine::general_purpose::STANDARD, Engine};
use openmls::prelude::*;
use openmls_rust_crypto::{OpenMlsRustCrypto, RustCrypto};
use openmls_basic_credential::SignatureKeyPair;
use once_cell::sync::Lazy;
use tls_codec::{Serialize, Deserialize};

static GROUPS: Lazy<Mutex<HashMap<u32, GroupHandle>>> = Lazy::new(|| Mutex::new(HashMap::new()));
static NEXT_ID: Lazy<Mutex<u32>> = Lazy::new(|| Mutex::new(1));

const CS: Ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;

struct GroupHandle {
    group: MlsGroup,
    signer: SignatureKeyPair,
    credential: CredentialWithKey,
}

fn b64(data: &[u8]) -> String { 
    STANDARD.encode(data) 
}

fn b64dec(s: &str) -> Result<Vec<u8>, String> { 
    STANDARD.decode(s).map_err(|e| e.to_string()) 
}

fn random_group_id() -> GroupId { 
    GroupId::from_slice(&RustCrypto::default().random_vec(16).unwrap()) 
}

fn next_id() -> u32 { 
    let mut g = NEXT_ID.lock().unwrap(); 
    let v = *g; 
    *g += 1; 
    v 
}

fn export_group_info_internal(
    group: &MlsGroup, 
    provider: &RustCrypto, 
    signer: &SignatureKeyPair
) -> Result<Vec<u8>, String> {
    let group_info = group.export_group_info(provider, signer, true)
        .map_err(|e| format!("export group info: {:?}", e))?;
    group_info.tls_serialize_detached()
        .map_err(|e| format!("serialize group info: {:?}", e))
}

#[wasm_bindgen(getter_with_clone)]
pub struct KeyPackageResult {
    pub key_package: String,
}

#[wasm_bindgen(getter_with_clone)]
pub struct CreateGroupResult {
    pub handle: u32,
    pub group_info: String,
}

#[wasm_bindgen(getter_with_clone)]
pub struct EncryptResult {
    pub message: String,
}

#[wasm_bindgen(getter_with_clone)]
pub struct DecryptResult {
    pub plaintext: Vec<u8>,
}

#[wasm_bindgen]
pub fn generate_key_package() -> Result<KeyPackageResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
    
    // Create signature keypair for Ed25519
    let signer = SignatureKeyPair::new(SignatureScheme::ED25519)
        .map_err(|e| JsValue::from_str(&format!("create signature key: {e:?}")))?;
    
    // Create basic credential
    let credential = BasicCredential::new(b"test@example.com".to_vec());
    let credential_with_key = CredentialWithKey {
        credential: credential.into(),
        signature_key: signer.to_public_vec().into(),
    };
    
    // Build key package
    let kp = KeyPackage::builder()
        .build(CS, provider, &signer, credential_with_key)
        .map_err(|e| JsValue::from_str(&format!("build key package: {e:?}")))?;
    
    let kp_bytes = kp.key_package().tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize key package: {e:?}")))?;
    
    Ok(KeyPackageResult { 
        key_package: b64(&kp_bytes) 
    })
}

#[wasm_bindgen]
pub fn create_group() -> Result<CreateGroupResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
    let _group_id = random_group_id();
    
    // Create signature keypair for Ed25519
    let signer = SignatureKeyPair::new(SignatureScheme::ED25519)
        .map_err(|e| JsValue::from_str(&format!("create signature key: {e:?}")))?;
    
    // Create basic credential
    let credential = BasicCredential::new(b"test@example.com".to_vec());
    let credential_with_key = CredentialWithKey {
        credential: credential.into(),
        signature_key: signer.to_public_vec().into(),
    };
    
    // Create group configuration
    let group_config = MlsGroupCreateConfig::builder()
        .ciphersuite(CS)
        .build();
    
    // Create MLS group
    let group = MlsGroup::new(
        provider,
        &signer,
        &group_config,
        credential_with_key.clone(),
    ).map_err(|e| JsValue::from_str(&format!("group creation: {e:?}")))?;
    
    // Export group info
    let group_info_bytes = export_group_info_internal(&group, &RustCrypto::default(), &signer)
        .map_err(|e| JsValue::from_str(&e))?;
    
    // Store group handle
    let handle = next_id();
    let group_handle = GroupHandle {
        group,
        signer,
        credential: credential_with_key,
    };
    GROUPS.lock().unwrap().insert(handle, group_handle);
    
    Ok(CreateGroupResult {
        handle,
        group_info: b64(&group_info_bytes),
    })
}

#[wasm_bindgen]
pub fn encrypt(handle: u32, plaintext: &[u8]) -> Result<EncryptResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
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
    let provider = &OpenMlsRustCrypto::default();
    let data = b64dec(message_b64).map_err(|e| JsValue::from_str(&e))?;
    let mut guard = GROUPS.lock().unwrap();
    let h = guard.get_mut(&handle).ok_or_else(|| JsValue::from_str("unknown handle"))?;
    
    let mls_message = MlsMessageIn::tls_deserialize(&mut data.as_slice())
        .map_err(|e| JsValue::from_str(&format!("parse message: {e:?}")))?;
    
    let processed = h.group.process_message(provider, mls_message.try_into_protocol_message()
        .map_err(|e| JsValue::from_str(&format!("convert message: {e:?}")))?)
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
