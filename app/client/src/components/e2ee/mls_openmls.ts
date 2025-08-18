// OpenMLS WASM ブリッジ - 実際のWASMバインディングを使用
import type {
  KeyPackageResult,
  CreateGroupResult,
  EncryptResult,
  DecryptResult,
} from "../../../../shared/mls-wasm/pkg/mls_wasm.d.ts";

interface MembersResult {
  members: string[];
}

export interface OpenMlsGeneratedKeyPackage {
  key_package: string; // base64 (TLS KeyPackage)
  hash: string; // hex sha256
  credential_id: string;
}

export interface OpenMlsCreatedGroup {
  handle: number;
  group_id: string; // base64
  key_package: string; // own key package (base64)
}

interface WasmModule {
  generate_key_package(): KeyPackageResult;
  create_group(): CreateGroupResult;
  encrypt(handle: number, plaintext: Uint8Array): EncryptResult;
  decrypt(handle: number, messageB64: string): DecryptResult;
  export_group_info(handle: number): string;
  get_group_members(handle: number): MembersResult;
}

let wasmModule: WasmModule | null = null;

async function loadWasm(): Promise<WasmModule> {
  if (!wasmModule) {
    const module = await import("../../../../shared/mls-wasm/pkg/mls_wasm.js");
    await module.default(); // WASMモジュールを初期化
    wasmModule = module as unknown as WasmModule;
  }
  return wasmModule;
}

export async function om_generateKeyPackage(identity: string): Promise<OpenMlsGeneratedKeyPackage> {
  const wasm = await loadWasm();
  const result = wasm.generate_key_package();
  
  // 簡単なハッシュ生成（実装改善が必要）
  const hash = Array.from(new TextEncoder().encode(result.key_package))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('').substring(0, 64);
  
  return {
    key_package: result.key_package,
    hash,
    credential_id: identity, // 暫定的にidentityを使用
  };
}

export async function om_createGroup(_identity: string): Promise<OpenMlsCreatedGroup> {
  const wasm = await loadWasm();
  const result = wasm.create_group();
  
  return {
    handle: result.handle,
    group_id: result.group_info, // 暫定的にgroup_infoを使用
    key_package: result.group_info, // 暫定的にgroup_infoを使用
  };
}

export async function om_encrypt(handle: number, data: Uint8Array | string): Promise<string> {
  const wasm = await loadWasm();
  const plaintext = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const result = wasm.encrypt(handle, plaintext);
  return result.message;
}

export async function om_decrypt(handle: number, messageB64: string): Promise<Uint8Array> {
  const wasm = await loadWasm();
  const result = wasm.decrypt(handle, messageB64);
  return result.plaintext;
}

export async function om_exportGroupInfo(handle: number): Promise<string> {
  const wasm = await loadWasm();
  return wasm.export_group_info(handle);
}

export async function om_getGroupMembers(handle: number): Promise<string[]> {
  const wasm = await loadWasm();
  const result = wasm.get_group_members(handle);
  return result.members;
}

export function om_freeGroup(handle: number): void {
  // WASMでメモリ管理が自動化されているため、現在は何もしない
  // 必要に応じて将来実装
  console.log(`Freeing group handle ${handle} (no-op for now)`);
}
