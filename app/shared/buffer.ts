export function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  return btoa(String.fromCharCode(...u8));
}

export function b64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// 16進文字列をUint8Arrayに変換
export function hexToBuf(hex: string): Uint8Array {
  const matches = hex.match(/.{2}/g);
  return matches
    ? Uint8Array.from(matches.map((h) => parseInt(h, 16)))
    : new Uint8Array();
}

export function strToBuf(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function bufToStr(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  return new TextDecoder().decode(u8);
}
