import type {
  AccountKey,
  AccountKeyPrivate,
  AccountKeyPub,
  deviceKey,
  deviceKeyPrivate,
  deviceKeyPub,
  EncryptedData,
  EncryptedDataDeviceKey,
  EncryptedDataKeyShareKey,
  EncryptedDataRoomKey,
  HashChainElement,
  IdentityKey,
  IdentityKeyPrivate,
  IdentityKeyPub,
  KeyShareKey,
  KeyShareKeyPrivate,
  KeyShareKeyPub,
  MasterKey,
  MasterKeyPrivate,
  MasterKeyPub,
  Message,
  migrateDataSignKey,
  migrateDataSignKeyPrivate,
  migrateDataSignKeyPub,
  migrateKey,
  migrateKeyPrivate,
  migrateKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
  RoomKey,
  Sign,
} from "./types.ts";
export type {
  AccountKey,
  AccountKeyPrivate,
  AccountKeyPub,
  deviceKey,
  deviceKeyPrivate,
  deviceKeyPub,
  EncryptedData,
  EncryptedDataDeviceKey,
  EncryptedDataKeyShareKey,
  EncryptedDataRoomKey,
  HashChainElement,
  IdentityKey,
  IdentityKeyPrivate,
  IdentityKeyPub,
  KeyShareKey,
  KeyShareKeyPrivate,
  KeyShareKeyPub,
  MasterKey,
  MasterKeyPrivate,
  MasterKeyPub,
  Message,
  migrateDataSignKey,
  migrateDataSignKeyPrivate,
  migrateDataSignKeyPub,
  migrateKey,
  migrateKeyPrivate,
  migrateKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
  RoomKey,
  Sign,
};
import { decode, encode } from "base64-arraybuffer";

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return encode(buffer);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return decode(base64);
}

export async function exportfromJWK(key: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey("jwk", key);
}

// 文字列のハッシュを生成
async function hashString(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hashBuffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// JWK形式の鍵から公開鍵ハッシュを生成
export async function generateKeyHashHex(jwk: JsonWebKey): Promise<string> {
  const keyString = JSON.stringify(jwk);
  return await hashString(keyString);
}

export async function createMasterKey(): Promise<MasterKey> {
  const KeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const MasterKeyPublickHex = await generateKeyHashHex(
    await crypto.subtle.exportKey("jwk", KeyPair.publicKey),
  );
  return {
    public: {
      key: await exportfromJWK(KeyPair.publicKey),
      keyType: "masterPub",
      version: 1,
    },
    private: {
      key: await exportfromJWK(KeyPair.privateKey),
      keyType: "masterPrivate",
      version: 1,
    },
    hashHex: MasterKeyPublickHex,
    version: 1,
  };
}

export async function createIdentityKeyAndAccountKey(
  masterKey: MasterKey,
): Promise<{ identityKey: IdentityKey; accountKey: AccountKey }> {
  const identityKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const identityKeyPublic = await exportfromJWK(identityKeyPair.publicKey);
  const identityKeyPrivate = await exportfromJWK(identityKeyPair.privateKey);
  const identityKeyHash = await generateKeyHashHex(identityKeyPublic);

  const accountKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const accountKeyPublic = await exportfromJWK(accountKeyPair.publicKey);
  const accountKeyPrivate = await exportfromJWK(accountKeyPair.privateKey);

  const identityKeySign = await signKey(
    masterKey,
    identityKeyPublic,
    "master",
  );
  const time = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
  const sign2 = await signKeyExpiration(masterKey, time, "master");

  const identityKeyPublicResult: IdentityKeyPub = {
    key: identityKeyPublic,
    keyType: "identityPub",
    sign: identityKeySign,
    keyExpiration: time,
    keyExpirationSign: sign2,
    version: 1,
  };
  const identityKeyPrivateResult: IdentityKeyPrivate = {
    key: identityKeyPrivate,
    keyType: "identityPrivate",
    version: 1,
  };
  const identityKey: IdentityKey = {
    public: identityKeyPublicResult,
    private: identityKeyPrivateResult,
    hashHex: identityKeyHash,
    version: 1,
  };
  const accountKeySign = await signKey(
    identityKey,
    accountKeyPublic,
    "identity",
  );
  const accountKey: AccountKey = {
    public: {
      key: accountKeyPublic,
      keyType: "accountPub",
      sign: accountKeySign,
      version: 1,
    },
    private: {
      key: accountKeyPrivate,
      keyType: "accountPrivate",
      version: 1,
    },
    hashHex: identityKey.hashHex,
    version: 1,
  };
  return { identityKey, accountKey };
}
export async function importKey(
  inputKey:
    | IdentityKeyPub
    | IdentityKeyPrivate
    | AccountKeyPub
    | AccountKeyPrivate
    | MasterKeyPub
    | MasterKeyPrivate
    | RoomKey
    | deviceKeyPub
    | deviceKeyPrivate
    | KeyShareKeyPub
    | KeyShareKeyPrivate
    | migrateKeyPub
    | migrateKeyPrivate
    | migrateDataSignKeyPub
    | migrateDataSignKeyPrivate,
  usages?: "public" | "private",
): Promise<CryptoKey> {
  const jwk = inputKey.key;
  const keyType = inputKey.keyType;
  let type: string;
  switch (keyType) {
    case "identityPub":
      type = "RSA-PSS";
      break;
    case "identityPrivate":
      type = "RSA-PSS";
      break;
    case "accountPub":
      type = "RSA-OAEP";
      break;
    case "accountPrivate":
      type = "RSA-OAEP";
      break;
    case "masterPub":
      type = "RSA-PSS";
      break;
    case "masterPrivate":
      type = "RSA-PSS";
      break;
    case "roomKey":
      type = "AES-GCM";
      break;
    case "devicePub":
      type = "RSA-OAEP";
      break;
    case "devicePrivate":
      type = "RSA-OAEP";
      break;
    case "keySharePub":
      type = "RSA-OAEP";
      break;
    case "keySharePrivate":
      type = "RSA-OAEP";
      break;
    case "migratePub":
      type = "RSA-OAEP";
      break;
    case "migratePrivate":
      type = "RSA-OAEP";
      break;
    case "migrateDataSignPub":
      type = "RSA-PSS";
      break;
    case "migrateDataSignPrivate":
      type = "RSA-PSS";
      break;
    default:
      throw new Error(`Unsupported keyType: ${keyType}`);
  }
  let key: CryptoKey;
  if (type === "RSA-OAEP") {
    const keyUsages: KeyUsage[] = usages === "public"
      ? ["encrypt"]
      : ["decrypt"];
    key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: type, hash: { name: "SHA-256" } },
      true,
      keyUsages,
    );
  } else if (type === "RSA-PSS") {
    const keyUsages: KeyUsage[] = usages === "public" ? ["verify"] : ["sign"];
    key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: type, hash: { name: "SHA-256" } },
      true,
      keyUsages,
    );
  } else if (type === "AES-GCM") {
    key = await crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
  } else {
    throw new Error(`Unsupported type: ${type}`);
  }
  return key;
}

export async function verifyKey(
  //署名した鍵の変数
  key: MasterKeyPub | IdentityKeyPub,
  signedKey:
    | IdentityKeyPub
    | AccountKeyPub
    | deviceKeyPub
    | deviceKeyPrivate
    | RoomKey
    | KeyShareKeyPub,
): Promise<boolean> {
  const importedKey = await crypto.subtle.importKey(
    "jwk",
    key.key,
    { name: "RSA-PSS", hash: { name: "SHA-256" } },
    true,
    ["verify"],
  );
  const keyBuffer = new TextEncoder().encode(JSON.stringify(signedKey.key));

  return await crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    importedKey,
    base64ToArrayBuffer(signedKey.sign.signature),
    keyBuffer, // ensure the same data is used
  );
}

export async function signKey(
  //署名する鍵の変数
  key: MasterKey | IdentityKey,
  keyToSign: JsonWebKey,
  type: "master" | "identity",
): Promise<Sign> {
  const keyBuffer = new TextEncoder().encode(JSON.stringify(keyToSign));
  return await sign(
    key,
    keyBuffer,
    type,
  );
}

async function sign(
  key: MasterKey | IdentityKey,
  data: ArrayBuffer,
  type: "master" | "identity",
): Promise<Sign> {
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    await importKey(key.private, "private"),
    data,
  );
  const publicKeyHashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(key.public.key)),
  );
  const hashedPublicKeyHex = Array.from(new Uint8Array(publicKeyHashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return {
    signature: arrayBufferToBase64(signature),
    hashedPublicKeyHex,
    type,
    version: 1,
  };
}

export async function signKeyExpiration(
  key: MasterKey | IdentityKey,
  date: string,
  type: "master" | "identity",
): Promise<Sign> {
  const signResult = await sign(
    key,
    new TextEncoder().encode(date),
    type,
  );
  return signResult;
}

export async function isValidKeyExpiration(
  key: MasterKeyPub | IdentityKeyPub,
  signedKey: { keyExpiration: string; keyExpirationSign: Sign },
): Promise<boolean> {
  try {
    const importedKey = await crypto.subtle.importKey(
      "jwk",
      key.key,
      { name: "RSA-PSS", hash: { name: "SHA-256" } },
      true,
      ["verify"],
    );

    const keyBuffer = new TextEncoder().encode(signedKey.keyExpiration);
    const signatureBuffer = base64ToArrayBuffer(
      signedKey.keyExpirationSign.signature,
    );

    return await crypto.subtle.verify(
      {
        name: "RSA-PSS",
        saltLength: 32,
      },
      importedKey,
      signatureBuffer,
      keyBuffer,
    );
  } catch (error) {
    console.error("Verification failed:", error);
    return false;
  }
}

export async function createDeviceKey(
  masterKey: MasterKey,
): Promise<deviceKey> {
  const deviceKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const deviceKeyPublic = await exportfromJWK(deviceKeyPair.publicKey);
  const deviceKeyPrivate = await exportfromJWK(deviceKeyPair.privateKey);
  const pubKeySign = await signKey(masterKey, deviceKeyPublic, "master");
  const privKeySign = await signKey(masterKey, deviceKeyPrivate, "master");
  return {
    public: {
      key: deviceKeyPublic,
      keyType: "devicePub",
      sign: pubKeySign,
      version: 1,
    },
    private: {
      key: deviceKeyPrivate,
      keyType: "devicePrivate",
      sign: privKeySign,
      version: 1,
    },
    hashHex: await generateKeyHashHex(deviceKeyPublic),
    version: 1,
  };
}

export async function isValidDeviceKey(
  masterKey: MasterKeyPub,
  deviceKey: deviceKey,
  checkKie: "public" | "private" | "both",
): Promise<boolean> {
  if (checkKie === "both") {
    return await verifyKey(masterKey, deviceKey.public) &&
      await verifyKey(masterKey, deviceKey.private);
  }
  if (checkKie === "public") {
    return await verifyKey(masterKey, deviceKey.public);
  }
  if (checkKie === "private") {
    return await verifyKey(masterKey, deviceKey.private);
  }
  return false;
}

export async function isValidIdentityKeySign(
  masterKeyPub: MasterKeyPub,
  identityKey: IdentityKeyPub,
): Promise<boolean> {
  const masterKeyHashHex = await generateKeyHashHex(masterKeyPub.key);
  if (identityKey.sign.hashedPublicKeyHex !== masterKeyHashHex) {
    return false;
  }
  const now = new Date();
  if (new Date(identityKey.keyExpiration) < now) {
    return false;
  }
  return await verifyKey(masterKeyPub, identityKey) &&
    await isValidKeyExpiration(masterKeyPub, identityKey);
}

export async function isValidAccountKey(
  identityKey: IdentityKeyPub,
  accountKey: AccountKeyPub,
): Promise<boolean> {
  const identityKeyHashHex = await generateKeyHashHex(identityKey.key);
  if (accountKey.sign.hashedPublicKeyHex !== identityKeyHashHex) {
    return false;
  }
  return await verifyKey(identityKey, accountKey);
}

export async function signData(
  key: AccountKey | IdentityKey | MasterKey,
  data: ArrayBuffer,
): Promise<Sign> {
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    await importKey(key.private, "private"),
    data,
  );
  const publicKeyHashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(key.public.key)),
  );
  const hashedPublicKeyHex = Array.from(new Uint8Array(publicKeyHashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return {
    signature: arrayBufferToBase64(signature),
    hashedPublicKeyHex,
    type: "master",
    version: 1,
  };
}

export async function verifyData(
  key: AccountKeyPub | IdentityKeyPub | MasterKeyPub,
  signedData: ArrayBuffer,
  signature: Sign,
): Promise<boolean> {
  const importedKey = await crypto.subtle.importKey(
    "jwk",
    key.key,
    { name: "RSA-PSS", hash: { name: "SHA-256" } },
    true,
    ["verify"],
  );
  return await crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    importedKey,
    base64ToArrayBuffer(signature.signature),
    signedData,
  );
}

export async function createRoomKey(
  identity_key: IdentityKey,
): Promise<RoomKey> {
  const roomKey = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
  const roomKeyJWK = await exportfromJWK(roomKey);
  const roomKeySign = await signKey(identity_key, roomKeyJWK, "identity");
  const Expiration = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
    .toISOString();
  const ExpirationSign = await signKeyExpiration(
    identity_key,
    Expiration,
    "identity",
  );
  const roomKeyHash = await generateKeyHashHex(roomKeyJWK);
  return {
    key: roomKeyJWK,
    sign: roomKeySign,
    keyExpiration: Expiration,
    keyExpirationSign: ExpirationSign,
    keyType: "roomKey",
    hashHex: roomKeyHash,
    version: 1,
  };
}

export async function isValidRoomKey(
  identity_key: IdentityKeyPub,
  roomKey: RoomKey,
): Promise<boolean> {
  if (
    roomKey.sign.hashedPublicKeyHex !==
      await generateKeyHashHex(identity_key.key)
  ) {
    return false;
  }
  if (roomKey.keyExpiration < new Date().toISOString()) {
    return false;
  }
  return await verifyKey(identity_key, roomKey) &&
    await isValidKeyExpiration(identity_key, roomKey);
}

//RoomKeyを使って暗号化
export async function encryptAndSignDataWithRoomKey(
  roomKey: RoomKey,
  data: string,
  identity_key: IdentityKey,
): Promise<EncryptedDataRoomKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    await importKey(roomKey, "public"),
    new TextEncoder().encode(data),
  );
  const encryptedDataSign = await signData(identity_key, encryptedData);
  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    keyType: "roomKey",
    iv: arrayBufferToBase64(iv),
    encryptedDataSign: encryptedDataSign,
    encryptedKeyHashHex: roomKey.hashHex,
    signKeyHashHex: roomKey.sign.hashedPublicKeyHex,
    version: 1,
  };
}

export async function decryptAndVerifyDataWithRoomKey(
  roomKey: RoomKey,
  encryptedData: EncryptedDataRoomKey,
  identity_key: IdentityKeyPub,
): Promise<string | null> {
  if (roomKey.hashHex !== encryptedData.encryptedKeyHashHex) {
    return null;
  }
  if (roomKey.sign.hashedPublicKeyHex !== encryptedData.signKeyHashHex) {
    return null;
  }
  if (
    !await verifyData(
      identity_key,
      base64ToArrayBuffer(encryptedData.encryptedData),
      encryptedData.encryptedDataSign,
    )
  ) {
    return null;
  }
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToArrayBuffer(encryptedData.iv || ""),
    },
    await importKey(roomKey, "private"),
    base64ToArrayBuffer(encryptedData.encryptedData),
  );
  return new TextDecoder().decode(decryptedData);
}

// AccountKeyを使って暗号化する関数
export async function encryptAndSignDataWithAccountKey(
  accountKey: AccountKeyPub,
  data: string,
  identity_key: IdentityKey,
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const DataArray = splitArrayBuffer(new TextEncoder().encode(data), 160);
  const key = await importKey(accountKey, "public");
  const encryptedData = await Promise.all(
    DataArray.map(async (buffer) => {
      return arrayBufferToBase64(
        await crypto.subtle.encrypt(
          {
            name: "RSA-OAEP",
            iv: iv,
          },
          key,
          buffer,
        ),
      );
    }),
  );
  const encryptedDataSign = await signData(
    identity_key,
    new TextEncoder().encode(JSON.stringify(encryptedData)),
  );
  return {
    encryptedData: encryptedData,
    keyType: "accountKey",
    iv: arrayBufferToBase64(iv),
    encryptedDataSign: encryptedDataSign,
    encryptedKeyHashHex: await generateKeyHashHex(accountKey.key),
    signKeyHashHex: accountKey.sign.hashedPublicKeyHex,
    version: 1,
    /*
    encryptedData: string[];
    keyType: "accountKey";
    encryptedDataSign: Sign;
    encryptedKeyHashHex: string;
    signKeyHashHex: string;
    */
  };
}

// AccountKeyで暗号化されたデータを復号化し、検証する関数
export async function decryptAndVerifyDataWithAccountKey(
  accountKey: AccountKey,
  encryptedData: EncryptedData,
  identity_key: IdentityKeyPub,
): Promise<string | null> {
  if (
    !await verifyData(
      identity_key,
      new TextEncoder().encode(JSON.stringify(encryptedData.encryptedData)),
      encryptedData.encryptedDataSign,
    )
  ) {
    return null;
  }
  const key = await importKey(accountKey.private, "private");
  const decryptedDataArray = await Promise.all(
    encryptedData.encryptedData.map(async (data) => {
      return await crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        key,
        base64ToArrayBuffer(data),
      );
    }),
  );
  return new TextDecoder().decode(rebuildArrayBuffer(decryptedDataArray));
}

export async function encryptDataDeviceKey(
  deviceKey: deviceKey,
  data: string,
): Promise<EncryptedDataDeviceKey> {
  const ArrayBuffer = new TextEncoder().encode(data);
  const dividedArrayBuffer = splitArrayBuffer(ArrayBuffer, 160);
  try {
    const key = await importKey(deviceKey.public, "public");
    const encryptedData = await Promise.all(
      dividedArrayBuffer.map(async (buffer) => {
        return arrayBufferToBase64(
          await crypto.subtle.encrypt(
            {
              name: "RSA-OAEP",
            },
            key,
            buffer,
          ),
        );
      }),
    );
    return {
      encryptedData: encryptedData,
      keyType: "DeviceKey",
      encryptedKeyHashHex: deviceKey.hashHex,
      version: 1,
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw error;
  }
}

export async function decryptDataDeviceKey(
  deviceKey: deviceKey,
  encryptedData: EncryptedDataDeviceKey,
): Promise<string | null> {
  const key = await importKey(deviceKey.private, "private");
  const decryptedDataArray = await Promise.all(
    encryptedData.encryptedData.map(async (data) => {
      return await crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        key,
        base64ToArrayBuffer(data),
      );
    }),
  );
  return new TextDecoder().decode(rebuildArrayBuffer(decryptedDataArray));
}

function splitArrayBuffer(
  buffer: ArrayBuffer,
  chunkSize: number,
): ArrayBuffer[] {
  const result: ArrayBuffer[] = [];
  const view = new Uint8Array(buffer);
  for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, buffer.byteLength);
    const chunk = view.slice(offset, end).buffer;
    result.push(chunk);
  }
  return result;
}

function rebuildArrayBuffer(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce(
    (acc, buffer) => acc + buffer.byteLength,
    0,
  );
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return result.buffer;
}
export async function createKeyShareKey(
  masterKey: MasterKey,
): Promise<KeyShareKey> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const keyPublic = await exportfromJWK(keyPair.publicKey);
  const keyPrivate = await exportfromJWK(keyPair.privateKey);
  const pubKeySign = await signKey(masterKey, keyPublic, "master");
  const keyShareKeyPublic: KeyShareKeyPub = {
    key: keyPublic,
    keyType: "keySharePub",
    sign: pubKeySign,
    keyExpiration: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
      .toISOString(),
    keyExpirationSign: await signKeyExpiration(
      masterKey,
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
      "master",
    ),
    version: 1,
  };
  const keyShareKeyPrivate: KeyShareKeyPrivate = {
    key: keyPrivate,
    keyType: "keySharePrivate",
  };
  return {
    public: keyShareKeyPublic,
    private: keyShareKeyPrivate,
    hashHex: await generateKeyHashHex(keyPublic),
    version: 1,
  };
}

export async function isValidKeyShareKey(
  masterKey: MasterKeyPub,
  keyShareKey: KeyShareKeyPub,
): Promise<boolean> {
  if (
    !await verifyKey(masterKey, keyShareKey) ||
    !await isValidKeyExpiration(masterKey, keyShareKey)
  ) {
    return false;
  }
  return true;
}

export async function encryptAndSignDataWithKeyShareKey(
  keyShareKey: KeyShareKeyPub,
  data: string,
  master_key: MasterKey,
): Promise<EncryptedDataKeyShareKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const DataArray = splitArrayBuffer(new TextEncoder().encode(data), 160);
  const key = await importKey(keyShareKey, "public");
  const encryptedData = await Promise.all(
    DataArray.map(async (buffer) => {
      return arrayBufferToBase64(
        await crypto.subtle.encrypt(
          {
            name: "RSA-OAEP",
            iv: iv,
          },
          key,
          buffer,
        ),
      );
    }),
  );
  const encryptedDataSign = await signData(
    master_key,
    new TextEncoder().encode(JSON.stringify(encryptedData)),
  );
  return {
    encryptedData: encryptedData,
    keyType: "keyShareKey",
    iv: arrayBufferToBase64(iv),
    encryptedDataSign: encryptedDataSign,
    encryptedKeyHashHex: await generateKeyHashHex(keyShareKey.key),
    signKeyHashHex: keyShareKey.sign.hashedPublicKeyHex,
    version: 1,
  };
}

export async function decryptAndVerifyDataWithKeyShareKey(
  keyShareKey: KeyShareKey,
  encryptedData: EncryptedDataKeyShareKey,
  master_key: MasterKeyPub,
): Promise<string | null> {
  if (
    !await verifyData(
      master_key,
      new TextEncoder().encode(JSON.stringify(encryptedData.encryptedData)),
      encryptedData.encryptedDataSign,
    )
  ) {
    return null;
  }
  const key = await importKey(keyShareKey.private, "private");
  const decryptedDataArray = await Promise.all(
    encryptedData.encryptedData.map(async (data) => {
      return await crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        key,
        base64ToArrayBuffer(data),
      );
    }),
  );
  return new TextDecoder().decode(rebuildArrayBuffer(decryptedDataArray));
}

export async function generateMigrateKey(): Promise<migrateKey> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const keyPublic = await exportfromJWK(keyPair.publicKey);
  const keyPrivate = await exportfromJWK(keyPair.privateKey);
  return {
    public: {
      key: keyPublic,
      keyType: "migratePub",
      version: 1,
    },
    private: {
      key: keyPrivate,
      keyType: "migratePrivate",
      version: 1,
    },
    hashHex: await generateKeyHashHex(keyPublic),
    version: 1,
  };
}

export async function encryptDataWithMigrateKey(
  migrateKey: migrateKeyPub,
  data: string,
): Promise<string> {
  const vi = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(migrateKey, "public");
  const DataArray = splitArrayBuffer(new TextEncoder().encode(data), 160);
  const encryptedData = await Promise.all(
    DataArray.map(async (buffer) => {
      return arrayBufferToBase64(
        await crypto.subtle.encrypt(
          {
            name: "RSA-OAEP",
            iv: vi,
          },
          key,
          buffer,
        ),
      );
    }),
  );
  return JSON.stringify(encryptedData);
}

export async function decryptDataWithMigrateKey(
  migrateKey: migrateKey,
  encryptedData: string,
): Promise<string> {
  const key = await importKey(migrateKey.private, "private");
  const encryptedDataArray = JSON.parse(encryptedData);
  const decryptedDataArray = await Promise.all(
    encryptedDataArray.map(async (data: string) => {
      return await crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        key,
        base64ToArrayBuffer(data),
      );
    }),
  );
  const decryptedData = rebuildArrayBuffer(decryptedDataArray);
  return new TextDecoder().decode(decryptedData);
}

export async function generateMigrateDataSignKey(): Promise<
  migrateDataSignKey
> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const keyPublic = await exportfromJWK(keyPair.publicKey);
  const keyPrivate = await exportfromJWK(keyPair.privateKey);
  return {
    public: {
      key: keyPublic,
      keyType: "migrateDataSignPub",
      version: 1,
    },
    private: {
      key: keyPrivate,
      keyType: "migrateDataSignPrivate",
      version: 1,
    },
    hashHex: await generateKeyHashHex(keyPublic),
    version: 1,
  };
}

export async function signDataWithMigrateDataSignKey(
  migrateDataSignKey: migrateDataSignKey,
  data: string,
): Promise<string> {
  const key = await importKey(migrateDataSignKey.private, "private");
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    key,
    new TextEncoder().encode(data),
  );
  return arrayBufferToBase64(signature);
}

export async function verifyDataWithMigrateDataSignKey(
  migrateDataSignKey: migrateDataSignKeyPub,
  data: string,
  signature: string,
): Promise<boolean> {
  const key = await importKey(migrateDataSignKey, "public");
  return await crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    key,
    base64ToArrayBuffer(signature),
    new TextEncoder().encode(data),
  );
}

export async function encryptMessage(
  message: Message,
  roomKey: RoomKey,
  identityKey: IdentityKey,
): Promise<EncryptedDataRoomKey> {
  return await encryptAndSignDataWithRoomKey(
    roomKey,
    JSON.stringify(message),
    identityKey,
  );
}

export async function decryptMessage(
  encryptedMessage: EncryptedDataRoomKey,
  roomKey: RoomKey,
  identityKey: IdentityKeyPub,
): Promise<Message | null> {
  const decryptedData = await decryptAndVerifyDataWithRoomKey(
    roomKey,
    encryptedMessage,
    identityKey,
  );
  if (!decryptedData) {
    return null;
  }
  return JSON.parse(decryptedData);
}