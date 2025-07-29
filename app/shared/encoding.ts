export function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  return btoa(String.fromCharCode(...u8));
}

export function b64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  return bufToB64(buf);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  return b64ToBuf(b64).buffer;
}
