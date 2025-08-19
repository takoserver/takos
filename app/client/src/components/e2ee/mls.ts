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
  groupIdB64: string;
}

interface AddMembersResult {
  commit: Uint8Array;
  welcomes: Uint8Array[];
}

interface JoinWithWelcomeResult {
  handle: number;
  group_info: string;
}

interface JoinWithGroupInfoResult {
  handle: number;
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

interface WasmModule {
  generate_key_package(identity: string): KeyPackageResult;
  create_group(identity: string): CreateGroupResult;
  encrypt(handle: number, plaintext: Uint8Array): EncryptResult;
  decrypt(handle: number, messageB64: string): DecryptResult;
  export_group_info(handle: number): string;
  get_group_members(handle: number): MembersResult;
  add_members(handle: number, keyPackages: string[]): AddMembersResult;
  join_with_welcome(
    identity: string,
    welcome: Uint8Array,
  ): JoinWithWelcomeResult;
  remove_members(handle: number, indices: number[]): RemoveMembersResult;
  update_key(handle: number): UpdateKeyResult;
  join_with_group_info(
    identity: string,
    groupInfo: Uint8Array,
  ): JoinWithGroupInfoResult;
  process_commit(handle: number, commit: Uint8Array): MembersResult;
  process_proposal(handle: number, proposal: Uint8Array): MembersResult;
  decode_key_package(data: Uint8Array): Uint8Array;
  peek_wire(data: Uint8Array): number;
  free_group(handle: number): void;
  verify_key_package(data: Uint8Array, expected?: string): boolean;
  verify_commit(data: Uint8Array): boolean;
  verify_private_message(data: Uint8Array): boolean;
  verify_group_info(data: Uint8Array): boolean;
  verify_welcome(data: Uint8Array): boolean;
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

function groupInfoToGroupIdB64(groupInfoB64: string): string {
  const bytes = b64ToBuf(groupInfoB64);
  if (bytes.length === 0) return "";
  const len = bytes[0];
  const gid = bytes.slice(1, 1 + len);
  return bufToB64(gid);
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
    groupIdB64: groupInfoToGroupIdB64(result.group_info),
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

export async function decodeMlsMessage(
  data: Uint8Array,
  _wireFormat = 0,
): Promise<unknown[]> {
  const wasm = await loadWasm();
  try {
    const key = wasm.decode_key_package(data);
    return [
      { keyPackage: { leafNode: { signaturePublicKey: key } } },
    ];
  } catch {
    return [];
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
export async function peekWire(
  b64: string,
): Promise<DecodedWirePeek | null> {
  try {
    const raw = b64ToBuf(b64);
    const wasm = await loadWasm();
    const idx = wasm.peek_wire(raw);
    const kinds: WireKind[] = [
      "unknown",
      "mls_key_package",
      "mls_welcome",
      "mls_group_info",
      "mls_public_message",
      "mls_private_message",
    ];
    return { kind: kinds[idx] ?? "unknown", raw };
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
    identity,
  };
}

export async function verifyKeyPackage(
  pkg: string | Uint8Array,
  expectedIdentity?: string,
): Promise<boolean> {
  try {
    const wasm = await loadWasm();
    const bytes = typeof pkg === "string" ? b64ToBuf(pkg) : pkg;
    return wasm.verify_key_package(bytes, expectedIdentity);
  } catch (err) {
    console.warn("verifyKeyPackage failed", err);
    return false;
  }
}

export async function verifyCommit(data: Uint8Array): Promise<boolean> {
  try {
    const wasm = await loadWasm();
    return wasm.verify_commit(data);
  } catch (err) {
    console.warn("verifyCommit failed", err);
    return false;
  }
}

export async function verifyPrivateMessage(
  data: Uint8Array,
): Promise<boolean> {
  try {
    const wasm = await loadWasm();
    return wasm.verify_private_message(data);
  } catch (err) {
    console.warn("verifyPrivateMessage failed", err);
    return false;
  }
}

export async function getGroupMembers(
  state: StoredGroupState,
): Promise<string[]> {
  if (state.members) {
    return state.members;
  }
  return await om_getGroupMembers(state.handle);
}

export async function verifyGroupInfo(data: Uint8Array): Promise<boolean> {
  try {
    const wasm = await loadWasm();
    return wasm.verify_group_info(data);
  } catch (err) {
    console.warn("verifyGroupInfo failed", err);
    return false;
  }
}

export async function verifyWelcome(data: Uint8Array): Promise<boolean> {
  try {
    const wasm = await loadWasm();
    return wasm.verify_welcome(data);
  } catch (err) {
    console.warn("verifyWelcome failed", err);
    return false;
  }
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
  commit: Uint8Array;
  welcomes: WelcomeEntry[];
  state: StoredGroupState;
  evidences: RosterEvidence[];
}> {
  return (async () => {
    const wasm = await loadWasm();
    const pkgs = addKeyPackages.map((p) => p.content);
    const res = wasm.add_members(state.handle, pkgs);
    const members = await om_getGroupMembers(state.handle);
    const welcomes = addKeyPackages.map((p, i) => ({
      actor: p.actor,
      deviceId: p.deviceId,
      data: res.welcomes[i],
    }));
    const evidences = addKeyPackages.map((p) => ({
      type: "RosterEvidence" as const,
      actor: p.actor ?? "",
      keyPackageUrl: p.url ?? "",
      keyPackageHash: p.hash ?? "",
      leafSignatureKeyFpr: p.leafSignatureKeyFpr ?? "",
      fetchedAt: p.fetchedAt ?? new Date().toISOString(),
      etag: p.etag,
    }));
    return {
      commit: res.commit,
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
    const wasm = await loadWasm();
    const res = wasm.remove_members(state.handle, removeIndices);
    const members = await om_getGroupMembers(state.handle);
    return { commit: res.commit, state: { ...state, members } };
  })();
}

export async function updateKey(
  state: StoredGroupState,
  identity: string,
): Promise<
  { commit: Uint8Array; state: StoredGroupState; keyPair: GeneratedKeyPair }
> {
  const wasm = await loadWasm();
  const res = wasm.update_key(state.handle);
  const members = await om_getGroupMembers(state.handle);
  const kp: GeneratedKeyPair = {
    encoded: res.key_package,
    public: { encoded: res.key_package },
    identity,
  };
  return { commit: res.commit, state: { ...state, members }, keyPair: kp };
}

export function joinWithWelcome(
  welcome: Uint8Array,
  keyPair: GeneratedKeyPair,
): Promise<StoredGroupState> {
  return (async () => {
    const wasm = await loadWasm();
    const res = wasm.join_with_welcome(keyPair.identity, welcome);
    const members = await om_getGroupMembers(res.handle);
    return {
      handle: res.handle,
      identity: keyPair.identity,
      groupIdB64: groupInfoToGroupIdB64(res.group_info),
      members,
    };
  })();
}

export function joinWithGroupInfo(
  groupInfo: Uint8Array,
  keyPair: GeneratedKeyPair,
): Promise<{ commit: string; state: StoredGroupState }> {
  return (async () => {
    const wasm = await loadWasm();
    const res = wasm.join_with_group_info(keyPair.identity, groupInfo);
    const members = await om_getGroupMembers(res.handle);
    return {
      commit: bufToB64(res.commit),
      state: {
        handle: res.handle,
        identity: keyPair.identity,
        groupIdB64: groupInfoToGroupIdB64(res.group_info),
        members,
      },
    };
  })();
}

export function processCommit(
  state: StoredGroupState,
  message: Uint8Array,
): Promise<StoredGroupState> {
  return (async () => {
    const wasm = await loadWasm();
    const res = wasm.process_commit(state.handle, message);
    return { ...state, members: res.members };
  })();
}

export function processProposal(
  state: StoredGroupState,
  message: Uint8Array,
): Promise<StoredGroupState> {
  return (async () => {
    const wasm = await loadWasm();
    const res = wasm.process_proposal(state.handle, message);
    return { ...state, members: res.members };
  })();
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
  const wasm = await loadWasm();
  if (!wasm.verify_private_message(data)) {
    console.warn("verifyPrivateMessage failed");
    return null;
  }
  try {
    const b64 = btoa(String.fromCharCode(...data));
    const res = wasm.decrypt(state.handle, b64);
    return { plaintext: res.plaintext, state };
  } catch {
    return null;
  }
}

export async function freeGroup(handle: number): Promise<void> {
  const wasm = await loadWasm();
  wasm.free_group(handle);
}
