import { decode, encode } from "npm:base64-arraybuffer";

export function encodeBase64(buffer: ArrayBuffer): string {
  return encode(buffer);
}

export function decodeBase64(base64: string): ArrayBuffer {
  return decode(base64);
}
