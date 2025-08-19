export interface KeyPackageResult {
  key_package: string;
}

export interface CreateGroupResult {
  handle: number;
  group_info: string;
}

export interface EncryptResult {
  message: string;
}

export interface DecryptResult {
  plaintext: Uint8Array;
}

export function generate_key_package(identity: string): KeyPackageResult;
export function create_group(identity: string): CreateGroupResult;
export function encrypt(handle: number, plaintext: Uint8Array): EncryptResult;
export function decrypt(handle: number, messageB64: string): DecryptResult;
export function export_group_info(handle: number): string;
export function get_group_members(handle: number): { members: string[] };
export function add_members(
  handle: number,
  keyPackages: string[],
): { commit: Uint8Array; welcome: Uint8Array };
export function join_with_welcome(
  identity: string,
  welcome: Uint8Array,
): { handle: number; group_info: string };
export function remove_members(
  handle: number,
  indices: number[],
): { commit: Uint8Array };
export function update_key(
  handle: number,
): { commit: Uint8Array; key_package: string };
export function join_with_group_info(
  identity: string,
  groupInfo: Uint8Array,
): { handle: number; commit: Uint8Array; group_info: string };
export function process_commit(
  handle: number,
  commit: Uint8Array,
): { members: string[] };
export function process_proposal(
  handle: number,
  proposal: Uint8Array,
): { members: string[] };
export function decode_key_package(data: Uint8Array): Uint8Array;
export function peek_wire(data: Uint8Array): number;
export function free_group(handle: number): void;
export function verify_key_package(
  data: Uint8Array,
  expected?: string,
): boolean;
export function verify_commit(handle: number, data: Uint8Array): boolean;
export function verify_private_message(
  handle: number,
  data: Uint8Array,
): boolean;
export function verify_group_info(data: Uint8Array): boolean;
export function verify_welcome(data: Uint8Array): boolean;
