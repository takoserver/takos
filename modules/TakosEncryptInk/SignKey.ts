//鍵を鍵で署名して検証する関数

import type { Sign } from "./types.ts";
import { digestMessage } from "./utils/hash.ts"
import { exportfromJWK } from "./import.ts";
import { encodeBase64 } from "./keys/base64.ts";

//鍵を署名する関数
export async function signKey(
  key: CryptoKey,
  data: JsonWebKey,
  type: "master" | "identity",
): Promise<Sign> {
    const masterKeyHash = await digestMessage(JSON.stringify(exportfromJWK(key)));
    const signature = await crypto.subtle.sign(
        {
            name: "RSA-PSS",
            saltLength: 32,
        },
        key,
        new TextEncoder().encode(JSON.stringify(data)),
    );
    return {
        signature: encodeBase64(signature),
        hashedPublicKeyHex: masterKeyHash,
        type
    };
}

//鍵を検証する関数
export async function verifyKey(
  key: JsonWebKey,
  sign: Sign,
): Promise<boolean> {
    const importedKey = await crypto.subtle.importKey(
        "jwk",
        key,
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
        new TextEncoder().encode(JSON.stringify(key)),
        new Uint8Array(new TextEncoder().encode(sign.signature)),
    );
}