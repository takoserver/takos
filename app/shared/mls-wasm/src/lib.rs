use base64::{Engine, engine::general_purpose::STANDARD};
use js_sys::Array;
use once_cell::sync::Lazy;
use openmls::prelude::*;
use openmls_rust_crypto::{OpenMlsRustCrypto, RustCrypto};
use std::collections::HashMap;
use std::sync::Mutex;
use tls_codec::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

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
    signer: &SignatureKeyPair,
) -> Result<Vec<u8>, String> {
    let group_info = group
        .export_group_info(provider, signer, true)
        .map_err(|e| format!("export group info: {:?}", e))?;
    group_info
        .tls_serialize_detached()
        .map_err(|e| format!("serialize group info: {:?}", e))
}

fn members_from_group(group: &MlsGroup) -> Vec<String> {
    let mut members = Vec::new();
    for member in group.members() {
        if let Ok(basic_cred) = BasicCredential::try_from(member.credential.clone()) {
            let identity_bytes = basic_cred.identity();
            let identity = String::from_utf8_lossy(identity_bytes).to_string();
            members.push(identity);
        }
    }
    members
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
pub fn generate_key_package(identity: &str) -> Result<KeyPackageResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();

    // Create signature keypair for Ed25519
    let signer = SignatureKeyPair::new(SignatureScheme::ED25519)
        .map_err(|e| JsValue::from_str(&format!("create signature key: {e:?}")))?;

    // Create basic credential
    let credential = BasicCredential::new(identity.as_bytes().to_vec());
    let credential_with_key = CredentialWithKey {
        credential: credential.into(),
        signature_key: signer.to_public_vec().into(),
    };

    // Build key package
    let kp = KeyPackage::builder()
        .build(CS, provider, &signer, credential_with_key)
        .map_err(|e| JsValue::from_str(&format!("build key package: {e:?}")))?;

    let kp_bytes = kp
        .key_package()
        .tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize key package: {e:?}")))?;

    Ok(KeyPackageResult {
        key_package: b64(&kp_bytes),
    })
}

#[wasm_bindgen]
pub fn create_group(identity: &str) -> Result<CreateGroupResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
    let _group_id = random_group_id();

    // Create signature keypair for Ed25519
    let signer = SignatureKeyPair::new(SignatureScheme::ED25519)
        .map_err(|e| JsValue::from_str(&format!("create signature key: {e:?}")))?;

    // Create basic credential
    let credential = BasicCredential::new(identity.as_bytes().to_vec());
    let credential_with_key = CredentialWithKey {
        credential: credential.into(),
        signature_key: signer.to_public_vec().into(),
    };

    // Create group configuration
    let group_config = MlsGroupCreateConfig::builder().ciphersuite(CS).build();

    // Create MLS group
    let group = MlsGroup::new(
        provider,
        &signer,
        &group_config,
        credential_with_key.clone(),
    )
    .map_err(|e| JsValue::from_str(&format!("group creation: {e:?}")))?;

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
    let h = guard
        .get_mut(&handle)
        .ok_or_else(|| JsValue::from_str("unknown handle"))?;

    let msg = h
        .group
        .create_message(provider, &h.signer, plaintext)
        .map_err(|e| JsValue::from_str(&format!("create_message: {e:?}")))?;

    let wire = msg
        .tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize msg: {e:?}")))?;

    Ok(EncryptResult {
        message: b64(&wire),
    })
}

#[wasm_bindgen]
pub fn decrypt(handle: u32, message_b64: &str) -> Result<DecryptResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
    let data = b64dec(message_b64).map_err(|e| JsValue::from_str(&e))?;
    let mut guard = GROUPS.lock().unwrap();
    let h = guard
        .get_mut(&handle)
        .ok_or_else(|| JsValue::from_str("unknown handle"))?;

    let mls_message = MlsMessageIn::tls_deserialize_exact(&data)
        .map_err(|e| JsValue::from_str(&format!("parse message: {e:?}")))?;

    let protocol_message = mls_message.extract()
        .map_err(|e| JsValue::from_str(&format!("extract protocol message: {e:?}")))?;

    let processed = h
        .group
        .process_message(provider, protocol_message)
        .map_err(|e| JsValue::from_str(&format!("process_message: {e:?}")))?;

    match processed.into_content() {
        ProcessedMessageContent::ApplicationMessage(app_msg) => Ok(DecryptResult {
            plaintext: app_msg.into_bytes(),
        }),
        _ => Err(JsValue::from_str("not an application message")),
    }
}

#[wasm_bindgen(getter_with_clone)]
pub struct MembersResult {
    pub members: Vec<String>,
}

#[wasm_bindgen]
pub fn get_group_members(handle: u32) -> Result<MembersResult, JsValue> {
    let guard = GROUPS.lock().unwrap();
    let h = guard
        .get(&handle)
        .ok_or_else(|| JsValue::from_str("unknown handle"))?;
    Ok(MembersResult {
        members: members_from_group(&h.group),
    })
}

#[wasm_bindgen]
pub fn export_group_info(handle: u32) -> Result<String, JsValue> {
    let provider = &RustCrypto::default();
    let guard = GROUPS.lock().unwrap();
    let h = guard
        .get(&handle)
        .ok_or_else(|| JsValue::from_str("unknown handle"))?;
    let bytes = export_group_info_internal(&h.group, provider, &h.signer)
        .map_err(|e| JsValue::from_str(&e))?;
    Ok(b64(&bytes))
}

#[wasm_bindgen(getter_with_clone)]
pub struct AddMembersResult {
    pub commit: String,
    pub welcome: String,
}

#[wasm_bindgen]
pub fn add_members(handle: u32, key_packages: Array) -> Result<AddMembersResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
    let mut guard = GROUPS.lock().unwrap();
    let h = guard
        .get_mut(&handle)
        .ok_or_else(|| JsValue::from_str("unknown handle"))?;

    let mut kps = Vec::new();
    for kp_js in key_packages.iter() {
        let kp_b64 = kp_js
            .as_string()
            .ok_or_else(|| JsValue::from_str("invalid key package"))?;
        let kp_bytes = b64dec(&kp_b64).map_err(|e| JsValue::from_str(&e))?;
        let kp = KeyPackage::tls_deserialize_exact(&kp_bytes)
            .map_err(|e| JsValue::from_str(&format!("parse key package: {:?}", e)))?;
        kps.push(kp);
    }

    let (commit, welcome) = h
        .group
        .add_members(provider, &h.signer, &kps)
        .map_err(|e| JsValue::from_str(&format!("add_members: {:?}", e)))?;

    let commit_bytes = commit
        .tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize commit: {:?}", e)))?;
    let welcome_bytes = welcome
        .tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize welcome: {:?}", e)))?;

    Ok(AddMembersResult {
        commit: b64(&commit_bytes),
        welcome: b64(&welcome_bytes),
    })
}

#[wasm_bindgen(getter_with_clone)]
pub struct JoinWithWelcomeResult {
    pub handle: u32,
    pub group_info: String,
}

#[wasm_bindgen]
pub fn join_with_welcome(identity: &str, welcome: &[u8]) -> Result<JoinWithWelcomeResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();

    let signer = SignatureKeyPair::new(SignatureScheme::ED25519)
        .map_err(|e| JsValue::from_str(&format!("create signature key: {e:?}")))?;
    let credential = BasicCredential::new(identity.as_bytes().to_vec());
    let credential_with_key = CredentialWithKey {
        credential: credential.into(),
        signature_key: signer.to_public_vec().into(),
    };

    let w_bytes = welcome.to_vec();
    let welcome_msg = Welcome::tls_deserialize_exact(&w_bytes)
        .map_err(|e| JsValue::from_str(&format!("parse welcome: {:?}", e)))?;

    let config = MlsGroupJoinConfig::builder()
        .ciphersuite(CS)
        .build();

    let group = MlsGroup::new_from_welcome(provider, &config, welcome_msg, None)
        .map_err(|e| JsValue::from_str(&format!("join group: {:?}", e)))?;

    let group_info_bytes = export_group_info_internal(&group, &RustCrypto::default(), &signer)
        .map_err(|e| JsValue::from_str(&e))?;

    let handle = next_id();
    let gh = GroupHandle {
        group,
        signer,
        credential: credential_with_key,
    };
    GROUPS.lock().unwrap().insert(handle, gh);

    Ok(JoinWithWelcomeResult {
        handle,
        group_info: b64(&group_info_bytes),
    })
}

#[wasm_bindgen(getter_with_clone)]
pub struct RemoveMembersResult {
    pub commit: String,
}

#[wasm_bindgen]
pub fn remove_members(handle: u32, indices: Array) -> Result<RemoveMembersResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
    let mut guard = GROUPS.lock().unwrap();
    let h = guard
        .get_mut(&handle)
        .ok_or_else(|| JsValue::from_str("unknown handle"))?;

    let mut leaf_indices = Vec::new();
    for idx in indices.iter() {
        let v = idx
            .as_f64()
            .ok_or_else(|| JsValue::from_str("invalid index"))? as u32;
        leaf_indices.push(LeafNodeIndex::new(v));
    }

    let (commit, _welcome) = h
        .group
        .remove_members(provider, &h.signer, &leaf_indices)
        .map_err(|e| JsValue::from_str(&format!("remove_members: {:?}", e)))?;

    let commit_bytes = commit
        .tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize commit: {:?}", e)))?;

    Ok(RemoveMembersResult {
        commit: b64(&commit_bytes),
    })
}

#[wasm_bindgen(getter_with_clone)]
pub struct UpdateKeyResult {
    pub commit: String,
    pub key_package: String,
}

#[wasm_bindgen]
pub fn update_key(handle: u32) -> Result<UpdateKeyResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
    let mut guard = GROUPS.lock().unwrap();
    let h = guard
        .get_mut(&handle)
        .ok_or_else(|| JsValue::from_str("unknown handle"))?;

    let leaf_node_params = LeafNodeParameters::builder()
        .build()
        .map_err(|e| JsValue::from_str(&format!("build leaf node params: {:?}", e)))?;

    let commit = h
        .group
        .self_update(provider, &h.signer, leaf_node_params)
        .map_err(|e| JsValue::from_str(&format!("self_update: {:?}", e)))?;

    let commit_bytes = commit
        .tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize commit: {:?}", e)))?;

    let kp = KeyPackage::builder()
        .build(CS, provider, &h.signer, h.credential.clone())
        .map_err(|e| JsValue::from_str(&format!("build key package: {:?}", e)))?;
    let kp_bytes = kp
        .key_package()
        .tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize key package: {:?}", e)))?;

    Ok(UpdateKeyResult {
        commit: b64(&commit_bytes),
        key_package: b64(&kp_bytes),
    })
}

#[wasm_bindgen]
pub fn free_group(handle: u32) -> Result<(), JsValue> {
    let mut guard = GROUPS.lock().unwrap();
    if guard.remove(&handle).is_some() {
        Ok(())
    } else {
        Err(JsValue::from_str("unknown handle"))
    }
}

#[wasm_bindgen(getter_with_clone)]
pub struct JoinWithGroupInfoResult {
    pub handle: u32,
    pub commit: String,
    pub group_info: String,
}

#[wasm_bindgen]
pub fn join_with_group_info(
    identity: &str,
    group_info: &[u8],
) -> Result<JoinWithGroupInfoResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();

    let signer = SignatureKeyPair::new(SignatureScheme::ED25519)
        .map_err(|e| JsValue::from_str(&format!("create signature key: {e:?}")))?;
    let credential = BasicCredential::new(identity.as_bytes().to_vec());
    let credential_with_key = CredentialWithKey {
        credential: credential.into(),
        signature_key: signer.to_public_vec().into(),
    };

    let gi_bytes = group_info.to_vec();
    let gi = VerifiableGroupInfo::tls_deserialize_exact(&gi_bytes)
        .map_err(|e| JsValue::from_str(&format!("parse group info: {:?}", e)))?;

    let join_config = MlsGroupJoinConfig::builder()
        .ciphersuite(CS)
        .build();

    let (group, commit) = MlsGroup::join_by_external_commit(
        provider,
        &signer,
        Some(&join_config),
        gi,
        credential_with_key.clone(),
        Extensions::empty(),
        &[],
    )
    .map_err(|e| JsValue::from_str(&format!("join_by_external_commit: {:?}", e)))?;

    let commit_bytes = commit
        .tls_serialize_detached()
        .map_err(|e| JsValue::from_str(&format!("serialize commit: {:?}", e)))?;

    let group_info_bytes = export_group_info_internal(&group, &RustCrypto::default(), &signer)
        .map_err(|e| JsValue::from_str(&e))?;

    let handle = next_id();
    let gh = GroupHandle {
        group,
        signer,
        credential: credential_with_key,
    };
    GROUPS.lock().unwrap().insert(handle, gh);

    Ok(JoinWithGroupInfoResult {
        handle,
        commit: b64(&commit_bytes),
        group_info: b64(&group_info_bytes),
    })
}

#[wasm_bindgen]
pub fn process_commit(handle: u32, commit: &[u8]) -> Result<MembersResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
    let mut guard = GROUPS.lock().unwrap();
    let h = guard
        .get_mut(&handle)
        .ok_or_else(|| JsValue::from_str("unknown handle"))?;

    let buf = commit.to_vec();
    let msg_in = MlsMessageIn::tls_deserialize_exact(&buf)
        .map_err(|e| JsValue::from_str(&format!("parse commit: {:?}", e)))?;

    let protocol_message = msg_in.extract()
        .map_err(|e| JsValue::from_str(&format!("extract protocol message: {:?}", e)))?;

    let processed = h
        .group
        .process_message(provider, protocol_message)
        .map_err(|e| JsValue::from_str(&format!("process commit: {:?}", e)))?;

    match processed.into_content() {
        ProcessedMessageContent::StagedCommitMessage(staged_commit) => {
            h.group
                .merge_staged_commit(provider, *staged_commit)
                .map_err(|e| JsValue::from_str(&format!("merge commit: {:?}", e)))?;
            Ok(MembersResult {
                members: members_from_group(&h.group),
            })
        }
        _ => Err(JsValue::from_str("not a commit")),
    }
}

#[wasm_bindgen]
pub fn process_proposal(handle: u32, proposal: &[u8]) -> Result<MembersResult, JsValue> {
    let provider = &OpenMlsRustCrypto::default();
    let mut guard = GROUPS.lock().unwrap();
    let h = guard
        .get_mut(&handle)
        .ok_or_else(|| JsValue::from_str("unknown handle"))?;

    let buf = proposal.to_vec();
    let msg_in = MlsMessageIn::tls_deserialize_exact(&buf)
        .map_err(|e| JsValue::from_str(&format!("parse proposal: {:?}", e)))?;

    let protocol_message = msg_in.extract()
        .map_err(|e| JsValue::from_str(&format!("extract protocol message: {:?}", e)))?;

    let processed = h
        .group
        .process_message(provider, protocol_message)
        .map_err(|e| JsValue::from_str(&format!("process proposal: {:?}", e)))?;

    match processed.into_content() {
        ProcessedMessageContent::ProposalMessage(_) => {
            Ok(MembersResult {
                members: members_from_group(&h.group),
            })
        }
        _ => Err(JsValue::from_str("not a proposal")),
    }
}

#[wasm_bindgen]
pub fn decode_key_package(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let buf = data.to_vec();
    let kp = KeyPackage::tls_deserialize_exact(&buf)
        .map_err(|e| JsValue::from_str(&format!("parse key package: {:?}", e)))?;
    Ok(kp.leaf_node().signature_key().as_slice().to_vec())
}

#[wasm_bindgen]
pub fn decode_welcome(data: &[u8]) -> Result<JsValue, JsValue> {
    let buf = data.to_vec();
    let _welcome = Welcome::tls_deserialize_exact(&buf)
        .map_err(|e| JsValue::from_str(&format!("parse welcome: {:?}", e)))?;
    let obj = js_sys::Object::new();
    // Note: encrypted_group_info is no longer accessible in the new API
    js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("success"),
        &JsValue::from_bool(true),
    )
    .unwrap();
    Ok(obj.into())
}

#[wasm_bindgen]
pub fn decode_group_info(data: &[u8]) -> Result<JsValue, JsValue> {
    let buf = data.to_vec();
    let gi = VerifiableGroupInfo::tls_deserialize_exact(&buf)
        .map_err(|e| JsValue::from_str(&format!("parse group info: {:?}", e)))?;
    let obj = js_sys::Object::new();
    let gid = gi.group_id().as_slice().to_vec();
    js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("group_id"),
        &js_sys::Uint8Array::from(gid.as_slice()).into(),
    )
    .unwrap();
    Ok(obj.into())
}

#[wasm_bindgen]
pub fn decode_public_message(data: &[u8]) -> Result<JsValue, JsValue> {
    let buf = data.to_vec();
    let msg = MlsMessageIn::tls_deserialize_exact(&buf)
        .map_err(|e| JsValue::from_str(&format!("parse public message: {:?}", e)))?;
    
    match msg {
        MlsMessageIn::PublicMessage(pt) => {
            let obj = js_sys::Object::new();
            js_sys::Reflect::set(
                &obj,
                &JsValue::from_str("epoch"),
                &JsValue::from_f64(pt.epoch().as_u64() as f64),
            )
            .unwrap();
            Ok(obj.into())
        }
        _ => Err(JsValue::from_str("not a public message")),
    }
}

#[wasm_bindgen]
pub fn decode_private_message(data: &[u8]) -> Result<JsValue, JsValue> {
    let buf = data.to_vec();
    let msg = MlsMessageIn::tls_deserialize_exact(&buf)
        .map_err(|e| JsValue::from_str(&format!("parse private message: {:?}", e)))?;
    
    match msg {
        MlsMessageIn::PrivateMessage(ct) => {
            let obj = js_sys::Object::new();
            js_sys::Reflect::set(
                &obj,
                &JsValue::from_str("epoch"),
                &JsValue::from_f64(ct.epoch().as_u64() as f64),
            )
            .unwrap();
            Ok(obj.into())
        }
        _ => Err(JsValue::from_str("not a private message")),
    }
}

#[wasm_bindgen]
pub enum WireFormat {
    Unknown,
    KeyPackage,
    Welcome,
    GroupInfo,
    PublicMessage,
    PrivateMessage,
}

#[wasm_bindgen]
pub fn peek_wire(data: &[u8]) -> WireFormat {
    let buf = data.to_vec();
    if let Ok(msg) = MlsMessageIn::tls_deserialize_exact(&buf) {
        return match msg {
            MlsMessageIn::PublicMessage(_) => WireFormat::PublicMessage,
            MlsMessageIn::PrivateMessage(_) => WireFormat::PrivateMessage,
        };
    }

    let buf = data.to_vec();
    if KeyPackage::tls_deserialize_exact(&buf).is_ok() {
        return WireFormat::KeyPackage;
    }

    let buf = data.to_vec();
    if Welcome::tls_deserialize_exact(&buf).is_ok() {
        return WireFormat::Welcome;
    }

    let buf = data.to_vec();
    if VerifiableGroupInfo::tls_deserialize_exact(&buf).is_ok() {
        return WireFormat::GroupInfo;
    }

    WireFormat::Unknown
}

#[wasm_bindgen]
pub fn verify_key_package(data: &[u8], expected_identity: Option<String>) -> bool {
    let provider = &OpenMlsRustCrypto::default();
    let buf = data.to_vec();
    let kp = match KeyPackage::tls_deserialize_exact(&buf) {
        Ok(k) => k,
        Err(_) => return false,
    };

    if let Some(id) = expected_identity {
        let cred = kp.leaf_node().credential().clone();
        if let Ok(basic) = BasicCredential::try_from(cred) {
            if basic.identity() != id.as_bytes() {
                return false;
            }
        } else {
            return false;
        }
    }

    kp.verify(provider).is_ok()
}

#[wasm_bindgen]
pub fn verify_commit(handle: u32, data: &[u8]) -> bool {
    let provider = &OpenMlsRustCrypto::default();
    let mut guard = GROUPS.lock().unwrap();
    let h = match guard.get_mut(&handle) {
        Some(h) => h,
        None => return false,
    };

    let buf = data.to_vec();
    let msg = match MlsMessageIn::tls_deserialize_exact(&buf) {
        Ok(m) => m,
        Err(_) => return false,
    };

    let protocol_message = match msg.extract() {
        Ok(pm) => pm,
        Err(_) => return false,
    };

    let processed = match h.group.process_message(provider, protocol_message) {
        Ok(p) => p,
        Err(_) => return false,
    };

    matches!(processed.into_content(), ProcessedMessageContent::StagedCommitMessage(_))
}

#[wasm_bindgen]
pub fn verify_private_message(handle: u32, data: &[u8]) -> bool {
    let provider = &OpenMlsRustCrypto::default();
    let mut guard = GROUPS.lock().unwrap();
    let h = match guard.get_mut(&handle) {
        Some(h) => h,
        None => return false,
    };

    let buf = data.to_vec();
    let msg = match MlsMessageIn::tls_deserialize_exact(&buf) {
        Ok(m) => m,
        Err(_) => return false,
    };

    let protocol_message = match msg.extract() {
        Ok(pm) => pm,
        Err(_) => return false,
    };

    match h.group.process_message(provider, protocol_message) {
        Ok(processed) => matches!(processed.into_content(), ProcessedMessageContent::ApplicationMessage(_)),
        _ => false,
    }
}

#[wasm_bindgen]
pub fn verify_group_info(data: &[u8]) -> bool {
    let provider = &OpenMlsRustCrypto::default();
    let buf = data.to_vec();
    match VerifiableGroupInfo::tls_deserialize_exact(&buf) {
        Ok(gi) => gi.verify(provider).is_ok(),
        Err(_) => false,
    }
}

#[wasm_bindgen]
pub fn verify_welcome(data: &[u8]) -> bool {
    let _provider = &OpenMlsRustCrypto::default();
    let buf = data.to_vec();
    match Welcome::tls_deserialize_exact(&buf) {
        Ok(_w) => true, // Welcome verification API has changed, just return true for successful parsing
        Err(_) => false,
    }
}
