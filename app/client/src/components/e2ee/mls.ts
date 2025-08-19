// OpenMLS WASM ブリッジと基本的なラッパー API を統合したモジュール
import type {
  CreateGroupResult,
  DecryptResult,
  EncryptResult,
  KeyPackageResult,
} from "../../../../shared/mls-wasm/pkg/mls_wasm.d.ts";
import { b64ToBuf, bufToB64 } from "../../../../shared/buffer.ts";

interface MembersResult {
  members: string[];
}

interface OpenMlsGeneratedKeyPackage {
  key_package: string;
  hash: string;
  credential_id: string;
}

interface OpenMlsCreatedGroup {
  handle: number;
  group_id: string;
  key_package: string;
}

interface WasmModule {
  generate_key_package(identity: string): KeyPackageResult;
  create_group(identity: string): CreateGroupResult;
  encrypt(handle: number, plaintext: Uint8Array): EncryptResult;
  decrypt(handle: number, messageB64: string): DecryptResult;
  export_group_info(handle: number): string;
  get_group_members(handle: number): MembersResult;
}

let wasmModule: WasmModule | null = null;

async function loadWasm(): Promise<WasmModule> {
  if (!wasmModule) {
    const module = await import("../../../../shared/mls-wasm/pkg/mls_wasm.js");
    await module.default();
    wasmModule = module as unknown as WasmModule;
  }
  return wasmModule;
}

async function om_generateKeyPackage(
  identity: string,
): Promise<OpenMlsGeneratedKeyPackage> {
  const wasm = await loadWasm();
  const result = wasm.generate_key_package(identity);
  const hash = Array.from(new TextEncoder().encode(result.key_package))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 64);
  return {
    key_package: result.key_package,
    hash,
    credential_id: identity,
  };
}

async function om_createGroup(identity: string): Promise<OpenMlsCreatedGroup> {
  const wasm = await loadWasm();
  const result = wasm.create_group(identity);
  return {
    handle: result.handle,
    group_id: result.group_info,
    key_package: result.group_info,
  };
}

async function om_encrypt(
  handle: number,
  data: Uint8Array | string,
): Promise<string> {
  const wasm = await loadWasm();
  const plaintext = typeof data === "string"
    ? new TextEncoder().encode(data)
    : data;
  const result = wasm.encrypt(handle, plaintext);
  return result.message;
}

async function om_decrypt(
  handle: number,
  messageB64: string,
): Promise<Uint8Array> {
  const wasm = await loadWasm();
  const result = wasm.decrypt(handle, messageB64);
  return result.plaintext;
}

async function om_exportGroupInfo(handle: number): Promise<string> {
  const wasm = await loadWasm();
  return wasm.export_group_info(handle);
}

async function om_getGroupMembers(handle: number): Promise<string[]> {
  const wasm = await loadWasm();
  const result = wasm.get_group_members(handle);
  return result.members;
}

export interface GeneratedKeyPair {
  encoded: string;
  public: { encoded: string };
  private: { dummy: true };
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
  handle: number;
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

// --- MLS ワイヤ形式の簡易判定 ---
// 暫定: openmls の tls framing を厳密に解釈せず先頭種別バイトをヒューリスティック判定
// 必要に応じて Rust 側で decode API を追加し差し替える
export function peekWire(b64: string): DecodedWirePeek | null {
  try {
    const raw = b64ToBuf(b64);
    if (raw.length < 2) return { kind: "unknown", raw };
    // 簡易: 仕様で wireformat enum を参照できないため長さなどから分類は避ける
    // ここでは利用箇所が "private_message か? welcome か? group_info か?" 程度なので
    // プレーンに unknown を返し、呼び出し側で fallback する方式
    return { kind: "unknown", raw };
  } catch {
    return null;
  }
}

export async function generateKeyPair(
  identity: string,
): Promise<GeneratedKeyPair> {
  const kp = await om_generateKeyPackage(identity);
  return {
    encoded: kp.key_package,
    public: { encoded: kp.key_package },
    private: { dummy: true },
  };
}

export function verifyKeyPackage(
  _pkg: unknown,
  _expectedIdentity?: string,
): Promise<boolean> {
  return Promise.resolve(true);
}

export function verifyCommit(): Promise<boolean> {
  return Promise.resolve(true);
}

export function verifyPrivateMessage(): Promise<boolean> {
  return Promise.resolve(true);
}

export async function getGroupMembers(
  state: StoredGroupState,
): Promise<string[]> {
  if (state.members) {
    return state.members;
  }
  return await om_getGroupMembers(state.handle);
}

export function verifyGroupInfo(): Promise<boolean> {
  return Promise.resolve(true);
}

export function verifyWelcome(_data: Uint8Array): Promise<boolean> {
  return Promise.resolve(true);
}

export async function createMLSGroup(
  identity: string,
): Promise<
  { state: StoredGroupState; keyPair: GeneratedKeyPair; gid: Uint8Array }
> {
  const created = await om_createGroup(identity);
  const keyPair = await generateKeyPair(identity);
  const members = await om_getGroupMembers(created.handle);
  const state: StoredGroupState = {
    handle: created.handle,
    identity,
    groupIdB64: created.group_id,
    members,
  };
  return {
    state,
    keyPair,
    gid: Uint8Array.from(atob(created.group_id), (c) => c.charCodeAt(0)),
  };
}

export function addMembers(
  state: StoredGroupState,
  _addKeyPackages: RawKeyPackageInput[],
): Promise<
  {
    commit: Uint8Array;
    welcomes: WelcomeEntry[];
    state: StoredGroupState;
    evidences: RosterEvidence[];
  }
> {
  return Promise.resolve({
    commit: new Uint8Array(),
    welcomes: [],
    state,
    evidences: [],
  });
}
export const createCommitAndWelcomes = addMembers;

export function removeMembers(
  state: StoredGroupState,
  _removeIndices: number[],
): Promise<{ commit: Uint8Array; state: StoredGroupState }> {
  return Promise.resolve({ commit: new Uint8Array(), state });
}

export async function updateKey(
  state: StoredGroupState,
  _identity: string,
): Promise<
  { commit: Uint8Array; state: StoredGroupState; keyPair: GeneratedKeyPair }
> {
  const kp = await generateKeyPair(state.identity);
  return { commit: new Uint8Array(), state, keyPair: kp };
}

export function joinWithWelcome(
  _welcome: Uint8Array,
  _keyPair: GeneratedKeyPair,
): Promise<StoredGroupState> {
  return Promise.reject(
    new Error("joinWithWelcome 未実装 (openmls wasm 拡張待ち)"),
  );
}

export function joinWithGroupInfo(
  _groupInfo: Uint8Array,
  _keyPair: GeneratedKeyPair,
): Promise<{ commit: string; state: StoredGroupState }> {
  return Promise.reject(new Error("joinWithGroupInfo 未実装"));
}

export function processCommit(
  state: StoredGroupState,
  _message: unknown,
): Promise<StoredGroupState> {
  return Promise.resolve(state);
}

export function processProposal(
  state: StoredGroupState,
  _message: unknown,
): Promise<StoredGroupState> {
  return Promise.resolve(state);
}

export async function exportGroupInfo(
  state: StoredGroupState,
): Promise<Uint8Array> {
  const b64 = await om_exportGroupInfo(state.handle);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const sentAck = new Set<string>();

export async function encryptMessage(
  state: StoredGroupState,
  plaintext: Uint8Array | string,
): Promise<{ message: Uint8Array; state: StoredGroupState }> {
  const b64 = await om_encrypt(state.handle, plaintext);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return { message: out, state };
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
    const b64 = btoa(String.fromCharCode(...data));
    const pt = await om_decrypt(state.handle, b64);
    return { plaintext: pt, state };
  } catch {
    return null;
  }
}
