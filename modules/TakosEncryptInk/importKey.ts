function pemToBase64(pem) {
  return pem
    .replace(/-----BEGIN [A-Z ]+-----/, "")
    .replace(/-----END [A-Z ]+-----/, "")
    .replace(/\s+/g, "");
}
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function importKeyFromPem(
  pem: string,
  type: "accountSignKey" | "accountEnscriptKey" | "roomKey" | "deviceKey",
  keyType: "publicKey" | "private" | "common",
): Promise<CryptoKey> {
  const base64 = pemToBase64(pem);
  const keyData = base64ToArrayBuffer(base64);
  let result: CryptoKey | null = null; // 初期化

  if (type === "accountEnscriptKey" || type === "deviceKey") {
    if (keyType === "publicKey") {
      result = await crypto.subtle.importKey(
        "spki",
        keyData,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["encrypt"],
      );
    } else if (keyType === "private") {
      result = await crypto.subtle.importKey(
        "pkcs8",
        keyData,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["decrypt"],
      );
    } else {
      throw new Error(`Unsupported keyType for ${type}: ${keyType}`);
    }
  } else if (type === "roomKey") {
    if (keyType === "common") {
      result = await crypto.subtle.importKey(
        "raw",
        keyData,
        {
          name: "AES-GCM",
        },
        true,
        ["encrypt", "decrypt"],
      );
    } else if (keyType === "private") {
      result = await crypto.subtle.importKey(
        "pkcs8",
        keyData,
        {
          name: "ECDH",
          hash: "SHA-256",
        },
        true,
        ["decrypt"],
      );
    } else if (keyType === "publicKey") {
      result = await crypto.subtle.importKey(
        "spki",
        keyData,
        {
          name: "ECDH",
          hash: "SHA-256",
        },
        true,
        ["encrypt"],
      );
    } else if (keyType === "accountSignKey") {
      result = await crypto.subtle.importKey(
        "pkcs8",
        keyData,
        {
          name: "RSASSA-PKCS1-PSS",
          hash: "SHA-256",
        },
        true,
        ["sign"],
      );
    } else {
      throw new Error(`Unsupported keyType for ${type}: ${keyType}`);
    }
  } else {
    throw new Error(`Unsupported type: ${type}`);
  }

  if (result === null) {
    throw new Error(
      `Failed to import key for type: ${type} and keyType: ${keyType}`,
    );
  }

  return result;
}
