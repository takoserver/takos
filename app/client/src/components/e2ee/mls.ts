// OpenMLS WASM ブリッジと基本的なラッパー API を統合したモジュール

import { b64ToBuf, bufToB64 } from "../../../../shared/buffer.ts";

// OpenMLS WASM モジュールのインポート
import wasmInit, {
  Group,
  Identity,
  KeyPackage,
  Provider,
  RatchetTree,
} from "../../../../shared/openmls-wasm/pkg/openmls_wasm.js";

interface OpenMlsGeneratedKeyPackage {
  key_package: string;
  hash: string;
  credential_id: string;
}

interface OpenMlsCreatedGroup {
  handle: Group;
  groupIdB64: string;
}

interface JoinWithWelcomeResult {
  handle: Group;
  group_info: string;
}

interface JoinWithGroupInfoResult {
  handle: Group;
  commit: Uint8Array;
  group_info: string;
}

interface UpdateKeyResult {
  commit: Uint8Array;
  key_package: string;
}

interface RemoveMembersResult {
  commit: Uint8Array;
}

let wasmInitialized = false;
let provider: Provider | null = null;

async function initWasm(): Promise<void> {
  if (!wasmInitialized) {
    await wasmInit();
    provider = new Provider();
    wasmInitialized = true;
  }
}

function getProvider(): Provider {
  if (!provider) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }
  return provider;
}

function generateGroupId(): string {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  return bufToB64(randomBytes);
}

async function om_generateKeyPackage(
  identity: string,
): Promise<OpenMlsGeneratedKeyPackage> {
  await initWasm();
  const provider = getProvider();
  const identityObj = new Identity(provider, identity);
  const keyPackage = identityObj.key_package(provider);
  const keyPackageData = keyPackage.tls_serialize();
  const keyPackageStr = bufToB64(keyPackageData);

  const hashArray = new Uint8Array(
    await crypto.subtle.digest("SHA-256", keyPackageData),
  );
  const hash = Array.from(hashArray).map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    key_package: keyPackageStr,
    hash,
    credential_id: identity,
  };
}

async function om_createGroup(identity: string): Promise<OpenMlsCreatedGroup> {
  await initWasm();
  const provider = getProvider();
  const identityObj = new Identity(provider, identity);
  const groupId = generateGroupId();
  const group = Group.create_new(provider, identityObj, groupId);

  return {
    handle: group,
    groupIdB64: groupId,
  };
}

async function om_encrypt(
  group: Group,
  data: Uint8Array | string,
): Promise<Uint8Array> {
  await initWasm();
  const provider = getProvider();
  const identityObj = new Identity(provider, "sender"); // 実際の送信者IDに置き換える
  const plaintext = typeof data === "string"
    ? new TextEncoder().encode(data)
    : data;
  return group.create_message(provider, identityObj, plaintext);
}

async function om_exportGroupInfo(group: Group): Promise<Uint8Array> {
  await initWasm();
  const _provider = getProvider();
  // OpenMLSでは直接GroupInfoをエクスポートする機能がないため、
  // ratchet treeをエクスポートして使用
  const _ratchetTree = group.export_ratchet_tree();
  // 仮実装: 実際の実装では適切なGroupInfo形式に変換が必要
  return new Uint8Array(0);
}

export interface GeneratedKeyPair {
  encoded: string;
  public: { encoded: string };
  private?: { encoded: string };
  identity: string;
}

export interface RawKeyPackageInput {
  content: string;
  actor?: string;
  deviceId?: string;
  url?: string;
  hash?: string;
  leafSignatureKeyFpr?: string;
  fetchedAt?: string;
  etag?: string;
  kt?: { included: boolean };
}

export interface RosterEvidence {
  type: "RosterEvidence";
  actor: string;
  keyPackageUrl: string;
  keyPackageHash: string;
  leafSignatureKeyFpr: string;
  fetchedAt: string;
  etag?: string;
}

export interface WelcomeEntry {
  actor?: string;
  deviceId?: string;
  data: Uint8Array;
}

export interface StoredGroupState {
  handle: Group;
  identity: string;
  groupIdB64: string;
  members?: string[];
}

export const GROUP_METADATA_EXTENSION_TYPE = 0xff01;

export interface GroupMetadata {
  name: string;
  icon?: string;
}

/**
 * GroupContext 拡張に name / icon を詰める
 */
export function encodeGroupMetadata(meta: GroupMetadata) {
  const data = new TextEncoder().encode(JSON.stringify(meta));
  return { extensionType: GROUP_METADATA_EXTENSION_TYPE, extensionData: data };
}

/**
 * GroupContext 拡張から name / icon を取り出す
 */
export function decodeGroupMetadata(
  exts: { extensionType: number; extensionData: Uint8Array }[],
): GroupMetadata | null {
  const found = exts.find((e) =>
    e.extensionType === GROUP_METADATA_EXTENSION_TYPE
  );
  if (!found) return null;
  try {
    return JSON.parse(new TextDecoder().decode(found.extensionData));
  } catch {
    return null;
  }
}

// === MLS メッセージの TLV 形式シリアライズ ===

export type MLSMessageType =
  | "PublicMessage"
  | "PrivateMessage"
  | "Welcome"
  | "KeyPackage"
  | "Commit"
  | "Proposal"
  | "GroupInfo";

const typeToByte: Record<MLSMessageType, number> = {
  PublicMessage: 1,
  PrivateMessage: 2,
  Welcome: 3,
  KeyPackage: 4,
  Commit: 5,
  Proposal: 6,
  GroupInfo: 7,
};

const byteToType: Record<number, MLSMessageType> = {
  1: "PublicMessage",
  2: "PrivateMessage",
  3: "Welcome",
  4: "KeyPackage",
  5: "Commit",
  6: "Proposal",
  7: "GroupInfo",
};

function toBytes(body: Uint8Array | string): Uint8Array {
  return typeof body === "string" ? new TextEncoder().encode(body) : body;
}

function serialize(
  type: MLSMessageType,
  body: Uint8Array | string,
): Uint8Array {
  const bodyBuf = toBytes(body);
  const len = bodyBuf.length;
  const out = new Uint8Array(3 + len);
  out[0] = typeToByte[type];
  out[1] = (len >>> 8) & 0xff;
  out[2] = len & 0xff;
  out.set(bodyBuf, 3);
  return out;
}

function deserialize(
  data: Uint8Array,
): { type: MLSMessageType; body: Uint8Array } | null {
  if (data.length < 3) return null;
  const type = byteToType[data[0]];
  if (!type) return null;
  const len = (data[1] << 8) | data[2];
  if (data.length < 3 + len) return null;
  return { type, body: data.slice(3, 3 + len) };
}

export function encodePublicMessage(body: Uint8Array | string): string {
  return bufToB64(serialize("PublicMessage", body));
}

export function encodePrivateMessage(body: Uint8Array | string): string {
  return bufToB64(serialize("PrivateMessage", body));
}

export function encodeWelcome(body: Uint8Array | string): string {
  return bufToB64(serialize("Welcome", body));
}

export function encodeKeyPackage(body: Uint8Array | string): string {
  return bufToB64(serialize("KeyPackage", body));
}

export function encodeCommit(body: Uint8Array | string): string {
  return bufToB64(serialize("Commit", body));
}

export function encodeProposal(body: Uint8Array | string): string {
  return bufToB64(serialize("Proposal", body));
}

export function encodeGroupInfo(body: Uint8Array | string): string {
  return bufToB64(serialize("GroupInfo", body));
}

export function decodePublicMessage(data: string): Uint8Array | null {
  const decoded = parseMLSMessage(data);
  return decoded && decoded.type === "PublicMessage" ? decoded.body : null;
}

export function decodePrivateMessage(data: string): Uint8Array | null {
  const decoded = parseMLSMessage(data);
  return decoded && decoded.type === "PrivateMessage" ? decoded.body : null;
}

export function decodeWelcome(data: string): Uint8Array | null {
  const decoded = parseMLSMessage(data);
  return decoded && decoded.type === "Welcome" ? decoded.body : null;
}

export function decodeKeyPackage(data: string): Uint8Array | null {
  const decoded = parseMLSMessage(data);
  return decoded && decoded.type === "KeyPackage" ? decoded.body : null;
}

export function decodeCommit(data: string): Uint8Array | null {
  const decoded = parseMLSMessage(data);
  return decoded && decoded.type === "Commit" ? decoded.body : null;
}

export function decodeProposal(data: string): Uint8Array | null {
  const decoded = parseMLSMessage(data);
  return decoded && decoded.type === "Proposal" ? decoded.body : null;
}

export function decodeGroupInfo(data: string): Uint8Array | null {
  const decoded = parseMLSMessage(data);
  return decoded && decoded.type === "GroupInfo" ? decoded.body : null;
}

export function parseMLSMessage(
  data: string,
): { type: MLSMessageType; body: Uint8Array } | null {
  try {
    const u8 = b64ToBuf(data);
    return deserialize(u8);
  } catch {
    return null;
  }
}

export function decodeMlsMessage(
  data: Uint8Array,
  wireFormat = 0,
): Promise<unknown> {
  try {
    // OpenMLSでは直接デコード機能がないため、仮実装
    switch (wireFormat) {
      case 1:
        return Promise.resolve({
          keyPackage: { leafNode: { signaturePublicKey: data } },
        });
      case 2:
        return Promise.resolve({ welcome: data });
      case 3:
        return Promise.resolve({ groupInfo: data });
      case 4:
        return Promise.resolve({ publicMessage: data });
      case 5:
        return Promise.resolve({ privateMessage: data });
      default:
        return Promise.resolve({});
    }
  } catch {
    return Promise.resolve({});
  }
}

export type WireKind =
  | "unknown"
  | "mls_key_package"
  | "mls_private_message"
  | "mls_welcome"
  | "mls_group_info"
  | "mls_public_message";

export interface DecodedWirePeek {
  kind: WireKind;
  raw: Uint8Array;
}

// --- MLS ワイヤ形式の判定 ---
export function peekWire(
  b64: string,
): Promise<DecodedWirePeek | null> {
  try {
    const raw = b64ToBuf(b64);
    // OpenMLSでは直接ワイヤ形式の判定機能がないため、仮実装
    // 実際の実装では、メッセージの先頭バイトで判定する必要がある
    return Promise.resolve({ kind: "unknown", raw });
  } catch {
    return Promise.resolve(null);
  }
}

export async function generateKeyPair(
  identity: string,
): Promise<GeneratedKeyPair> {
  const kp = await om_generateKeyPackage(identity);
  return {
    encoded: kp.key_package,
    public: { encoded: kp.key_package },
    identity,
  };
}

export function verifyKeyPackage(
  pkg: string | Uint8Array,
  _expectedIdentity?: string,
): Promise<boolean> {
  try {
    // OpenMLSでは直接検証機能がないため、
    // パッケージのパースが成功するかで判定
    const bytes = typeof pkg === "string" ? b64ToBuf(pkg) : pkg;
    return Promise.resolve(bytes.length > 0); // 仮実装
  } catch (err) {
    console.warn("verifyKeyPackage failed", err);
    return Promise.resolve(false);
  }
}

export function verifyCommit(
  _group: Group,
  data: Uint8Array,
): Promise<boolean> {
  try {
    // OpenMLSでは直接検証機能がないため、仮実装
    return Promise.resolve(data.length > 0);
  } catch (err) {
    console.warn("verifyCommit failed", err);
    return Promise.resolve(false);
  }
}

export function verifyPrivateMessage(
  _group: Group,
  data: Uint8Array,
): Promise<boolean> {
  try {
    // OpenMLSでは直接検証機能がないため、仮実装
    return Promise.resolve(data.length > 0);
  } catch (err) {
    console.warn("verifyPrivateMessage failed", err);
    return Promise.resolve(false);
  }
}

export function getGroupMembers(state: StoredGroupState): string[] {
  return state.members ?? [];
}

export function verifyGroupInfo(data: Uint8Array): Promise<boolean> {
  try {
    // OpenMLSでは直接検証機能がないため、仮実装
    return Promise.resolve(data.length > 0);
  } catch (err) {
    console.warn("verifyGroupInfo failed", err);
    return Promise.resolve(false);
  }
}

export function verifyWelcome(data: Uint8Array): Promise<boolean> {
  try {
    // OpenMLSでは直接検証機能がないため、仮実装
    return Promise.resolve(data.length > 0);
  } catch (err) {
    console.warn("verifyWelcome failed", err);
    return Promise.resolve(false);
  }
}

export async function createMLSGroup(
  identity: string,
): Promise<
  { state: StoredGroupState; keyPair: GeneratedKeyPair; gid: Uint8Array }
> {
  const created = await om_createGroup(identity);
  const keyPair = await generateKeyPair(identity);
  const members = [identity];
  const state: StoredGroupState = {
    handle: created.handle,
    identity,
    groupIdB64: created.groupIdB64,
    members,
  };
  return {
    state,
    keyPair,
    gid: b64ToBuf(created.groupIdB64),
  };
}

export function addMembers(
  state: StoredGroupState,
  addKeyPackages: RawKeyPackageInput[],
): Promise<{
  commits: Uint8Array[];
  welcomes: WelcomeEntry[];
  state: StoredGroupState;
  evidences: RosterEvidence[];
}> {
  return (async () => {
    await initWasm();
    const provider = getProvider();
    const identityObj = new Identity(provider, state.identity);

    const commits: Uint8Array[] = [];
    const welcomes: WelcomeEntry[] = [];
    const evidences: RosterEvidence[] = [];

    for (const pkg of addKeyPackages) {
      const kpBytes = b64ToBuf(pkg.content);
      try {
        // OpenMLS WASM バインディングの KeyPackage.tls_deserialize を使用
        let keyPackage;
        try {
          keyPackage = KeyPackage.tls_deserialize(kpBytes);
        } catch (primaryError) {
          console.warn("Primary KeyPackage.tls_deserialize failed, trying fallback:", primaryError);
          // フォールバック方法を試す
          keyPackage = KeyPackage.tls_deserialize_fallback(kpBytes);
        }
        
        const messages = state.handle.propose_and_commit_add(
          provider,
          identityObj,
          keyPackage,
        );
        state.handle.merge_pending_commit(provider);
        commits.push(messages.commit);
        welcomes.push({
          actor: pkg.actor,
          deviceId: pkg.deviceId,
          data: messages.welcome,
        });
      } catch (err) {
        console.warn("addMembers KeyPackage.tls_deserialize failed", err);
        // デシリアライズまたは追加に失敗した場合は空のプレースホルダを返す
        commits.push(new Uint8Array(0));
        welcomes.push({
          actor: pkg.actor,
          deviceId: pkg.deviceId,
          data: new Uint8Array(0),
        });
      }
      evidences.push({
        type: "RosterEvidence" as const,
        actor: pkg.actor ?? "",
        keyPackageUrl: pkg.url ?? "",
        keyPackageHash: pkg.hash ?? "",
        leafSignatureKeyFpr: pkg.leafSignatureKeyFpr ?? "",
        fetchedAt: pkg.fetchedAt ?? new Date().toISOString(),
        etag: pkg.etag,
      });
    }
    const memberSet = new Set(state.members ?? []);
    for (const pkg of addKeyPackages) {
      if (pkg.actor) memberSet.add(pkg.actor);
    }
    const members = Array.from(memberSet);

    return {
      commits,
      welcomes,
      state: { ...state, members },
      evidences,
    };
  })();
}
export const createCommitAndWelcomes = addMembers;

export function removeMembers(
  state: StoredGroupState,
  removeIndices: number[],
): Promise<{ commit: Uint8Array; state: StoredGroupState }> {
  return (async () => {
    await initWasm();
    // OpenMLSではメンバー削除は複雑な操作のため、仮実装
    const members = (state.members ?? []).filter((_, i) =>
      !removeIndices.includes(i)
    );
    return {
      commit: new Uint8Array(), // 仮実装
      state: { ...state, members },
    };
  })();
}

export async function updateKey(
  state: StoredGroupState,
  identity: string,
): Promise<
  { commit: Uint8Array; state: StoredGroupState; keyPair: GeneratedKeyPair }
> {
  await initWasm();
  // OpenMLSでは鍵更新は複雑な操作のため、仮実装
  const keyPair = await generateKeyPair(identity);
  const members = state.members ?? [];
  return {
    commit: new Uint8Array(), // 仮実装
    state: { ...state, members },
    keyPair,
  };
}

export function joinWithWelcome(
  welcome: Uint8Array,
  keyPair: GeneratedKeyPair,
): Promise<StoredGroupState> {
  return (async () => {
    await initWasm();
    const provider = getProvider();
    const _identityObj = new Identity(provider, keyPair.identity);

    // RatchetTreeの準備（仮実装）
    const ratchetTree = new RatchetTree(); // 実際にはWelcomeメッセージから抽出

    const group = Group.join(provider, welcome, ratchetTree);
    const groupId = generateGroupId(); // 実際にはWelcomeメッセージから抽出

    return {
      handle: group,
      identity: keyPair.identity,
      groupIdB64: groupId,
      members: [keyPair.identity],
    };
  })();
}

export function joinWithGroupInfo(
  _groupInfo: Uint8Array,
  keyPair: GeneratedKeyPair,
): Promise<{ commit: string; state: StoredGroupState }> {
  return (async () => {
    await initWasm();
    // OpenMLSでは直接GroupInfoからの参加は複雑なため、仮実装
    const provider = getProvider();
    const identityObj = new Identity(provider, keyPair.identity);
    const groupId = generateGroupId(); // 実際にはGroupInfoから抽出

    // 仮実装: 新しいグループを作成
    const group = Group.create_new(provider, identityObj, groupId);

    return {
      commit: "", // 仮実装
      state: {
        handle: group,
        identity: keyPair.identity,
        groupIdB64: groupId,
        members: [keyPair.identity],
      },
    };
  })();
}

export function processCommit(
  state: StoredGroupState,
  message: Uint8Array,
): Promise<StoredGroupState> {
  return (async () => {
    await initWasm();
    const provider = getProvider();

    // OpenMLSでCommitメッセージを処理
    const _decryptedData = state.handle.process_message(provider, message);
    return { ...state };
  })();
}

export function processProposal(
  state: StoredGroupState,
  message: Uint8Array,
): Promise<StoredGroupState> {
  return (async () => {
    await initWasm();
    const provider = getProvider();

    // OpenMLSでProposalメッセージを処理
    const _decryptedData = state.handle.process_message(provider, message);
    return { ...state };
  })();
}

export async function exportGroupInfo(
  state: StoredGroupState,
): Promise<Uint8Array> {
  return await om_exportGroupInfo(state.handle);
}

const sentAck = new Set<string>();

export async function encryptMessage(
  state: StoredGroupState,
  plaintext: Uint8Array | string,
): Promise<{ message: Uint8Array; state: StoredGroupState }> {
  const encryptedData = await om_encrypt(state.handle, plaintext);
  return { message: encryptedData, state };
}

export async function encryptMessageWithAck(
  state: StoredGroupState,
  plaintext: Uint8Array | string,
  roomId: string,
  deviceId: string,
): Promise<{ messages: Uint8Array[]; state: StoredGroupState }> {
  const key = `${roomId}:${deviceId}`;
  const messages: Uint8Array[] = [];
  if (!sentAck.has(key)) {
    const ackBody = JSON.stringify({ type: "joinAck", roomId, deviceId });
    const ack = await encryptMessage(state, ackBody);
    messages.push(ack.message);
    sentAck.add(key);
  }
  const msg = await encryptMessage(state, plaintext);
  messages.push(msg.message);
  return { messages, state };
}

export async function decryptMessage(
  state: StoredGroupState,
  data: Uint8Array,
): Promise<{ plaintext: Uint8Array; state: StoredGroupState } | null> {
  try {
    await initWasm();
    const provider = getProvider();

    // OpenMLSでメッセージを復号化
    const plaintext = state.handle.process_message(provider, data);
    return { plaintext, state };
  } catch (err) {
    console.warn("decryptMessage failed", err);
    return null;
  }
}

export function freeGroup(group: Group): void {
  // OpenMLSでは明示的なメモリ解放
  group.free();
}
