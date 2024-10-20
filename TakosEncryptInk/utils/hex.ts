export function arrayBufferToHex(buffer: ArrayBuffer): string {
  // ArrayBufferをUint8Arrayに変換
  const byteArray = new Uint8Array(buffer)

  // 各バイトを16進数に変換し、文字列として結合
  const hexString = Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

  return hexString
}
