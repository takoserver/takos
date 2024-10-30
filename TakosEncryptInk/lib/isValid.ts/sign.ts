import type { SingObject } from "../../types/keys.ts"
import { base64ToArrayBuffer } from "../../utils/buffers.ts"

export function isValidSign(sign: string): boolean {
  const signObject: SingObject = JSON.parse(sign)

  const signature = new Uint8Array(base64ToArrayBuffer(signObject.signature))
  const keyPrivateHash = new Uint8Array(base64ToArrayBuffer(signObject.signedKeyHash))
  if (signature.length !== 3309) return false
  if (keyPrivateHash.length !== 32) return false
  return true
}
