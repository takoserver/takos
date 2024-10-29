import { ml_dsa65 } from "@noble/post-quantum/ml-dsa"
import { SingObject } from "../types/keys.ts"
import { arrayBufferToBase64, base64ToArrayBuffer } from "./buffers.ts"
import { keyHash } from "./keyHash.ts"

export async function sign(
  key: {
    public: string
    private: string
  },
  data: string,
): Promise<SingObject> {
  const keyPrivate = new Uint8Array(base64ToArrayBuffer(key.private))

  const signature = ml_dsa65.sign(keyPrivate, new Uint8Array(new TextEncoder().encode(data)))
  const signString = arrayBufferToBase64(signature)
  const hash = await keyHash(key.public)
  return {
    signature: signString,
    signedKeyHash: hash,
  }
}

export function verify(
  key: string,
  data: string,
  sign: SingObject,
): boolean {
  const keyPublic = new Uint8Array(base64ToArrayBuffer(key))
  const signature = new Uint8Array(base64ToArrayBuffer(sign.signature))
  return ml_dsa65.verify(keyPublic, new Uint8Array(new TextEncoder().encode(data)), signature)
}
