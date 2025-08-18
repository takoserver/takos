import {
  om_generateKeyPackage,
  om_createGroup,
  om_encrypt,
  om_decrypt,
  om_getGroupMembers,
  om_exportGroupInfo,
} from "./mls_openmls.ts";

export interface GeneratedKeyPair {
  encoded: string; // base64 KeyPackage
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

export interface WelcomeEntry { actor?: string; deviceId?: string; data: Uint8Array }

export interface StoredGroupState {
  handle: number;
  identity: string;
  groupIdB64: string;
  members?: string[]; // メンバーリストをキャッシュ
}

  export async function generateKeyPair(identity: string): Promise<GeneratedKeyPair> {
    const kp = await om_generateKeyPackage(identity);
    return { encoded: kp.key_package, public: { encoded: kp.key_package }, private: { dummy: true } };
  }

  export function verifyKeyPackage(_pkg: unknown, _expectedIdentity?: string): Promise<boolean> {
    // TODO: Rust 側で decode/verify を公開
    return Promise.resolve(true);
  }

  export function verifyCommit(): Promise<boolean> { return Promise.resolve(true); }
  export function verifyPrivateMessage(): Promise<boolean> { return Promise.resolve(true); }

  export async function getGroupMembers(state: StoredGroupState): Promise<string[]> {
    // キャッシュがあればそれを返す
    if (state.members) {
      return state.members;
    }
    // キャッシュがなければWASMから取得
    return await om_getGroupMembers(state.handle);
  }

  export function verifyGroupInfo(): Promise<boolean> { 
    return Promise.resolve(true); 
  }
  export function verifyWelcome(_data: Uint8Array): Promise<boolean> { return Promise.resolve(true); }

  export async function createMLSGroup(identity: string): Promise<{ state: StoredGroupState; keyPair: GeneratedKeyPair; gid: Uint8Array }> {
    const created = await om_createGroup(identity);
    const keyPair = await generateKeyPair(identity);
    // メンバーリストを取得してキャッシュ
    const members = await om_getGroupMembers(created.handle);
    const state: StoredGroupState = { 
      handle: created.handle, 
      identity, 
      groupIdB64: created.group_id,
      members 
    };
    return { state, keyPair, gid: Uint8Array.from(atob(created.group_id), c => c.charCodeAt(0)) };
  }

  export function addMembers(state: StoredGroupState, _addKeyPackages: RawKeyPackageInput[]): Promise<{ commit: Uint8Array; welcomes: WelcomeEntry[]; state: StoredGroupState; evidences: RosterEvidence[] }> {
    // 未実装: 現段階では空 commit を返す
    return Promise.resolve({ commit: new Uint8Array(), welcomes: [], state, evidences: [] });
  }
  export const createCommitAndWelcomes = addMembers;

  export function removeMembers(state: StoredGroupState, _removeIndices: number[]): Promise<{ commit: Uint8Array; state: StoredGroupState }> {
    return Promise.resolve({ commit: new Uint8Array(), state });
  }

  export async function updateKey(state: StoredGroupState, _identity: string): Promise<{ commit: Uint8Array; state: StoredGroupState; keyPair: GeneratedKeyPair }> {
    const kp = await generateKeyPair(state.identity);
    return { commit: new Uint8Array(), state, keyPair: kp };
  }

  export function joinWithWelcome(_welcome: Uint8Array, _keyPair: GeneratedKeyPair): Promise<StoredGroupState> {
    return Promise.reject(new Error("joinWithWelcome 未実装 (openmls wasm 拡張待ち)"));
  }
  export function joinWithGroupInfo(_groupInfo: Uint8Array, _keyPair: GeneratedKeyPair): Promise<{ commit: string; state: StoredGroupState }> {
    return Promise.reject(new Error("joinWithGroupInfo 未実装"));
  }

  export function processCommit(state: StoredGroupState, _message: unknown): Promise<StoredGroupState> { return Promise.resolve(state); }
  export function processProposal(state: StoredGroupState, _message: unknown): Promise<StoredGroupState> { return Promise.resolve(state); }

  export async function exportGroupInfo(state: StoredGroupState): Promise<Uint8Array> {
    const b64 = await om_exportGroupInfo(state.handle);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
    return out;
  }

  // Join ACK を一度だけ付加してメッセージを暗号化
  const sentAck = new Set<string>();

  export async function encryptMessage(state: StoredGroupState, plaintext: Uint8Array | string): Promise<{ message: Uint8Array; state: StoredGroupState }> {
    const b64 = await om_encrypt(state.handle, plaintext);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
    return { message: out, state };
  }

  export async function encryptMessageWithAck(state: StoredGroupState, plaintext: Uint8Array | string, roomId: string, deviceId: string): Promise<{ messages: Uint8Array[]; state: StoredGroupState }> {
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

  export async function decryptMessage(state: StoredGroupState, data: Uint8Array): Promise<{ plaintext: Uint8Array; state: StoredGroupState } | null> {
    try {
      const b64 = btoa(String.fromCharCode(...data));
      const pt = await om_decrypt(state.handle, b64);
      return { plaintext: pt, state };
    } catch {
      return null;
    }
  }
// 末尾
