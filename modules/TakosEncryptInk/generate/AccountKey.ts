async function generateAccountKey(): Promise<
  {
    encript: { publicKey: CryptoKey; privateKey: CryptoKey }
    sign: { publicKey: CryptoKey; privateKey: CryptoKey }
  }
> {
  const EncryptKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  )
  const SignKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )
  return {
    encript: {
      publicKey: EncryptKeyPair.publicKey,
      privateKey: EncryptKeyPair.privateKey,
    },
    sign: {
      publicKey: SignKeyPair.publicKey,
      privateKey: SignKeyPair.privateKey,
    },
  }
}

export default generateAccountKey
