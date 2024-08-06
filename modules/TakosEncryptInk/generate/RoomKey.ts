async function generateKeyPair() {
  const keys = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256", // 使用する楕円曲線
    },
    true,
    ["deriveKey", "deriveBits"],
  )
  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  }
}
export default generateKeyPair
