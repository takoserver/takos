async function digestMessage(message: string | undefined) {
  const msgUint8 = new TextEncoder().encode(message) // (utf-8 の) Uint8Array にエンコードする
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8) // メッセージをハッシュする
  const hashArray = Array.from(new Uint8Array(hashBuffer)) // バッファーをバイト列に変換する
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("") // バイト列を 16 進文字列に変換する
  return hashHex
}

export { digestMessage }
