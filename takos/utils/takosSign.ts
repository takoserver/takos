import ServerConfig from "../models/serverConfig.ts"
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: "SHA-256" },
    },
    true,
    ["sign", "verify"],
  )
  return keyPair
}

export const signData = async (
  data: string,
  privateKey: CryptoKey,
): Promise<ArrayBuffer> => {
  const signAlgorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: "SHA-256" },
  }
  const signature = await window.crypto.subtle.sign(
    signAlgorithm,
    privateKey,
    new TextEncoder().encode(data),
  )
  return signature
}
export const verifySignature = async (
  publicKey: CryptoKey,
  signature: ArrayBuffer,
  data: string,
): Promise<boolean> => {
  const signAlgorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: "SHA-256" },
  }
  return await window.crypto.subtle.verify(
    signAlgorithm,
    publicKey,
    signature,
    new TextEncoder().encode(data),
  )
}
export const getPrivateKey = async () => {
  const privateKey = await ServerConfig.findOne({ key: "privateKey" })
  if (privateKey === null) {
    const keyPair = await generateKeyPair()
    const privateKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey,
    )
    const publicKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey,
    )
    await ServerConfig.create({
      key: "privateKey",
      value: JSON.stringify(privateKey),
    })
    await ServerConfig.create({
      key: "publicKey",
      value: JSON.stringify(publicKey),
    })
    return keyPair.privateKey
  }
  const lastUpdate = await ServerConfig.findOne({ key: "lastUpdateKey" })
  if (
    !lastUpdate || new Date(lastUpdate.value) <
      new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7)
  ) {
    const keyPair = await generateKeyPair()
    const privateKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey,
    )
    const publicKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey,
    )
    await ServerConfig.updateOne({ key: "privateKey" }, {
      value: JSON.stringify(privateKey),
    })
    await ServerConfig.updateOne({ key: "publicKey" }, {
      value: JSON.stringify(publicKey),
    })
    return keyPair.privateKey
  }
  try {
    return await importCryptoKey(privateKey.value, ["sign"])
  } catch (e) {
    const keyPair = await generateKeyPair()
    const privateKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey,
    )
    const publicKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey,
    )
    await ServerConfig.updateOne({ key: "privateKey" }, {
      value: JSON.stringify(privateKey),
    })
    await ServerConfig.updateOne({ key: "publicKey" }, {
      value: JSON.stringify(publicKey),
    })
    return keyPair.privateKey
  }
}
export async function importCryptoKey(
  keyData: string | undefined,
  keyKind: ["sign" | "verify"],
): Promise<CryptoKey> {
  if (keyData === undefined) {
    throw new Error("keyData is undefined")
  }
  const jwkKey = JSON.parse(keyData)
  const cryptoKey = await window.crypto.subtle.importKey(
    "jwk", // インポート形式
    jwkKey, // インポートするキーデータ
    { // キーの使用目的とアルゴリズム
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    true, // エクスポート可能かどうか
    keyKind, // 秘密鍵の場合は["sign"]、公開鍵の場合は["verify"]
  )
  return cryptoKey
}
