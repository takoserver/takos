import csrfToken from "../models/csrftoken.ts";
import serverInfo from "../models/serverInfo.ts";
import { load } from "$std/dotenv/mod.ts";
let env = await load();
const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: "SHA-256" },
    },
    true,
    ["sign", "verify"],
  );
  return keyPair;
};
const takos = {
  checkCsrfToken: async (token: string, sessionid: string) => {
    if (typeof token !== "string") {
      return false;
    }
    const csrftoken = await csrfToken.findOne({ token: token, sessionID: sessionid });
    if (csrftoken === null) {
      return false;
    }
    csrftoken.deleteOne({ token: token });
    return true;
  },
  splitUserName: (userName: string) => {
    const split = userName.split("@");
    return {
      userName: split[0],
      domain: split[1],
    };
  },
  signData: async (data: string, privateKey: CryptoKey): Promise<ArrayBuffer> => {
    const signAlgorithm = {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    };
    const signature = await window.crypto.subtle.sign(
      signAlgorithm,
      privateKey,
      new TextEncoder().encode(data),
    );
    return signature;
  },
  verifySignature: async (publicKey: CryptoKey, signature: ArrayBuffer, data: string): Promise<boolean> => {
    const signAlgorithm = {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    };
    return await window.crypto.subtle.verify(
      signAlgorithm,
      publicKey,
      signature,
      new TextEncoder().encode(data),
    );
  },
  getPrivateKey: async () => {
    const server = await serverInfo.findOne({ serverDomain: env["DOMAIN"] });
    if (server === null) {
      const keyPair = await generateKeyPair();
      const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
      await serverInfo.create({
        serverDomain: env["DOMAIN"],
        privatekey: JSON.stringify(privateKey),
        publickey: JSON.stringify(publicKey),
      });
      return keyPair.privateKey;
    }
    if (server.privatekey === null) {
      const keyPair = await generateKeyPair();
      const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
      await serverInfo.updateOne({ serverDomain: env["DOMAIN"] }, { privatekey: JSON.stringify(privateKey), publickey: JSON.stringify(publicKey) });
      return keyPair.privateKey;
    }
    if (server.lastupdatekey < new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7)) {
      const keyPair = await generateKeyPair();
      const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
      await serverInfo.updateOne({ serverDomain: env["DOMAIN"] }, { privatekey: JSON.stringify(privateKey), publickey: JSON.stringify(publicKey) });
      return keyPair.privateKey;
    }
    try {
      return await importCryptoKey(server.privatekey);
    } catch (e) {
      const keyPair = await generateKeyPair();
      const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
      await serverInfo.updateOne({ serverDomain: env["DOMAIN"] }, { privatekey: JSON.stringify(privateKey), publickey: JSON.stringify(publicKey) });
      return keyPair.privateKey;
    }
  },
  checkEmail: (email: string) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  },
  generateRandom16DigitNumber(): string {
    const array = new Uint8Array(8); // 8バイト（64ビット）を生成
    crypto.getRandomValues(array);
    let randomNumber = "";
    for (const byte of array) {
      randomNumber += byte.toString().padStart(2, "0");
    }
    // 16桁にトリム
    const StringResult = randomNumber.slice(0, 16);
    return StringResult;
  },
  createSessionid: () => {
    const sessionIDarray = new Uint8Array(64);
    const randomarray = crypto.getRandomValues(sessionIDarray);
    const sessionid = Array.from(
      randomarray,
      (byte) => byte.toString(32).padStart(2, "0"),
    ).join("");
    return sessionid;
  },
  checkUserName: (userName: string) => {
    const userNamePattern = /^[a-zA-Z0-9]{4,16}$/;
    return userNamePattern.test(userName);
  },
  checkNickName: (nickName: string) => {
    // 1文字以上、16文字以下ひらがな、カタカナ、漢字、半角英数字、
    const nickNamePattern = /^[ぁ-んァ-ヶ一-龠a-zA-Z0-9]{1,16}$/;
    return nickNamePattern.test(nickName);
  },
  checkPassword: (password: string) => {
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,100}$/;
    return passwordPattern.test(password);
  },
  checkAge: (age: number) => {
    if (age < 0 || age > 200) {
      return false;
    }
    return true;
  },
};
export default takos;
async function importCryptoKey(keyData: string | undefined): Promise<CryptoKey> {
  if (keyData === undefined) {
    throw new Error("keyData is undefined");
  }
  const jwkKey = JSON.parse(keyData);
  const cryptoKey = await window.crypto.subtle.importKey(
    "jwk", // インポート形式
    jwkKey, // インポートするキーデータ
    { // キーの使用目的とアルゴリズム
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    true, // エクスポート可能かどうか
    ["sign"], // 秘密鍵の場合は["sign"]、公開鍵の場合は["verify"]
  );
  return cryptoKey;
}
