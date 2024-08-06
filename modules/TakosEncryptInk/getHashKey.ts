async function areKeysEqual(key1: CryptoKey, key2: CryptoKey, format: string) {
  async function getHashKey(key: CryptoKey, format: string): Promise<ArrayBuffer> {
    // 鍵をエクスポートしてArrayBufferに変換

    // deno-lint-ignore ban-ts-comment
    //@ts-ignore
    const exportedKey = await crypto.subtle.exportKey(format, key)

    // SHA-256ハッシュを計算
    const hash = await crypto.subtle.digest("SHA-256", exportedKey)

    return hash
  }
  // 2つの鍵のハッシュを取得
  const hash1 = await getHashKey(key1, format)
  const hash2 = await getHashKey(key2, format)

  // ハッシュ値を比較
  if (hash1.byteLength !== hash2.byteLength) {
    return false
  }

  const hash1Array = new Uint8Array(hash1)
  const hash2Array = new Uint8Array(hash2)

  for (let i = 0; i < hash1Array.length; i++) {
    if (hash1Array[i] !== hash2Array[i]) {
      return false
    }
  }

  return true
}
export { areKeysEqual }
