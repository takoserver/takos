import csrfToken from "../models/csrftoken.ts"
import serverInfo from "../models/serverInfo.ts"
import { load } from "$std/dotenv/mod.ts"
let env = await load()
const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256" },
    },
    true,
    ["sign", "verify"]
  );
  return keyPair
}
const takos = {
  checkCsrfToken: async (token: string) => {
    if (typeof token !== "string") {
      return false
    }
    const csrftoken = await csrfToken.findOne({ token: token })
    if (csrftoken === null) {
      return false
    }
    return true
  },
  splitUserName: (userName: string) => {
    const split = userName.split("@")
    return {
      userName: split[0],
      domain: split[1],
    }
  },
  signData: async (data: string, privateKey: CryptoKey): Promise<ArrayBuffer> =>{
    const signAlgorithm = {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" }
    };
    const signature = await window.crypto.subtle.sign(
        signAlgorithm,
        privateKey,
        new TextEncoder().encode(data)
    );
    return signature
  },
  verifySignature: async (publicKey: CryptoKey, signature: ArrayBuffer, data: string): Promise<boolean> => {
    const signAlgorithm = {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" }
    };
    return await window.crypto.subtle.verify(
        signAlgorithm,
        publicKey,
        signature,
        new TextEncoder().encode(data)
    );
  },
  getPrivateKey: async () => {
    const server = await serverInfo.findOne({ serverDomain: env["DOMAIN"] })
    if (server === null) {
      const keyPair = await generateKeyPair()
      const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey)
      const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey)
      await serverInfo.create({
        serverDomain: env["DOMAIN"],
        privatekey: JSON.stringify(privateKey),
        publickey: JSON.stringify(publicKey),
      })
      return keyPair.privateKey
    }
    if(server.privatekey === null){
      const keyPair = await generateKeyPair()
      const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey)
      const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey)
      await serverInfo.updateOne({ serverDomain: env["DOMAIN"] }, { privatekey: JSON.stringify(privateKey), publickey: JSON.stringify(publicKey) })
      return keyPair.privateKey
    }
    if(server.lastupdatekey < new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7)){
      const keyPair = await generateKeyPair()
      const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey)
      const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey)
      await serverInfo.updateOne({ serverDomain: env["DOMAIN"] }, { privatekey: JSON.stringify(privateKey), publickey: JSON.stringify(publicKey) })
      return keyPair.privateKey
    }
    try {
      return await importCryptoKey(server.privatekey)
    } catch (e) {
      const keyPair = await generateKeyPair()
      const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey)
      const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey)
      await serverInfo.updateOne({ serverDomain: env["DOMAIN"] }, { privatekey: JSON.stringify(privateKey), publickey: JSON.stringify(publicKey) })
      return keyPair.privateKey
    }
  }
}
export default takos
async function importCryptoKey(keyData: string | undefined): Promise<CryptoKey> {
  if (keyData === undefined) {
    throw new Error("keyData is undefined");
  }
  const jwkKey = JSON.parse(keyData);
  const cryptoKey = await window.crypto.subtle.importKey(
    "jwk", // インポート形式
    jwkKey, // インポートするキーデータ
    {   // キーの使用目的とアルゴリズム
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    true, // エクスポート可能かどうか
    ["sign"] // 秘密鍵の場合は["sign"]、公開鍵の場合は["verify"]
  );
  return cryptoKey;
}