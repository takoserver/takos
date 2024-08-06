export function importKey(
  Key: ArrayBuffer,
  type: "accountSignKey" | "accountEnscriptKey" | "roomKey" | "deviceKey",
  keyType: "publicKey" | "private" | "common",
) {
  if (type === "accountSignKey") {
    if (keyType === "publicKey") {
      return crypto.subtle.importKey(
        "spki",
        Key,
        {
          name: "RSASSA-PKCS1-PSS",
          hash: "SHA-256",
        },
        false,
        ["verify"],
      );
    }
    if (keyType === "private") {
      return crypto.subtle.importKey(
        "pkcs8",
        Key,
        {
          name: "RSASSA-PKCS1-PSS",
          hash: "SHA-256",
        },
        false,
        ["sign"],
      );
    }
  }
  if (type === "accountEnscriptKey") {
    if (keyType === "publicKey") {
      return crypto.subtle.importKey(
        "spki",
        Key,
        {
          name: "RSA-OAEP",
        },
        false,
        ["encrypt"],
      );
    }
    if (keyType === "private") {
      return crypto.subtle.importKey(
        "pkcs8",
        Key,
        {
          name: "RSA-OAEP",
        },
        false,
        ["decrypt"],
      );
    }
  }
  if (type === "roomKey") {
    if (keyType === "common") {
      return crypto.subtle.importKey(
        "raw",
        Key,
        {
          name: "AES-GCM",
        },
        false,
        ["encrypt", "decrypt"],
      );
    }
    if (keyType === "private") {
      return crypto.subtle.importKey(
        "pkcs8",
        Key,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        false,
        ["deriveKey"],
      );
    }
    if (keyType === "publicKey") {
      return crypto.subtle.importKey(
        "spki",
        Key,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        false,
        [],
      );
    }
  }
  if (type === "deviceKey") {
    if (keyType === "publicKey") {
      return crypto.subtle.importKey(
        "spki",
        Key,
        {
          name: "RSA-OAEP",
        },
        false,
        ["encrypt"],
      );
    }
    if (keyType === "private") {
      return crypto.subtle.importKey(
        "pkcs8",
        Key,
        {
          name: "RSA-OAEP",
        },
        false,
        ["decrypt"],
      );
    }
  }
}
async function importRoomCommonKeyToPemKey(pem: string) {
  // PEM形式の鍵からBase64部分を抽出
  const base64Key = pem
    .replace("-----BEGIN SHARED KEY-----", "")
    .replace("-----END SHARED KEY-----", "")
    .replace(/\n/g, "");

  // Base64デコードしてArrayBufferに変換
  const binaryKey = base64ToArrayBuffer(base64Key);

  // ArrayBufferをCryptoKeyにインポート
  const importedKey = await window.crypto.subtle.importKey(
    "raw",
    binaryKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  return importedKey;
}
function base64ToArrayBuffer(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
