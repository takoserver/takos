//アルゴリズムはrsa-pss 鍵長は4096

export function generateMasterKey(): Promise<{
  publicKey: CryptoKey
  privateKey: CryptoKey
}> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )
}

export function signMasterKey(
  privateKey: CryptoKey,
  data: ArrayBuffer,
): Promise<ArrayBuffer> {
  const result = crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    privateKey,
    data,
  )
  return result
}

export function verifyMasterKey(
  publicKey: CryptoKey,
  signature: ArrayBuffer,
  data: ArrayBuffer,
): Promise<boolean> {
  return crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    publicKey,
    signature,
    data,
  )
}
