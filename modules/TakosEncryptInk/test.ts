import {
  createIdentityKeyAndAccountKey,
  createMasterKey,
  createRoomKey,
  encryptMessage,
  signData,
  verifyAndDecryptMessage,
  verifyData,
} from "./main.ts"
import { Message } from "./types.ts"

const masterKey = await createMasterKey()
const { identityKey, accountKey } = await createIdentityKeyAndAccountKey(masterKey)
const roomKey = await createRoomKey(identityKey)
const message: Message = {
  message: "Hello, World!",
  type: "text",
  version: 1,
}
const encryptedMessage = await encryptMessage(roomKey, identityKey, message)
const decryptedMessage = await verifyAndDecryptMessage(
  roomKey,
  identityKey.public,
  encryptedMessage,
)
console.log(decryptedMessage)
