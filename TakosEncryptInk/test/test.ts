import { encryptMessage } from "../lib/EncryptMessage.ts"
import { encryptData, EncryptMessage, generate } from "../mod.ts"
import type { MessageValue } from "../types/Messages.ts"

const aliceMasterKey = await generate.createMasterKey()
const aliceIdentityKeyAndAccountKey = await generate
  .createIdentityKeyAndAccountKey(aliceMasterKey)

const bobMasterKey = await generate.createMasterKey()
const bobIdentityKeyAndAccountKey = await generate
  .createIdentityKeyAndAccountKey(bobMasterKey)

const roomKey = await generate.createRoomKey(
  [
    [aliceMasterKey.public, {
      key: aliceIdentityKeyAndAccountKey.IdentityKey[0].public,
      sign: aliceIdentityKeyAndAccountKey.IdentityKey[1],
    }, {
      key: aliceIdentityKeyAndAccountKey.AccountKey[0].public,
      sign: aliceIdentityKeyAndAccountKey.AccountKey[1],
    }, "alice"],
    [bobMasterKey.public, {
      key: bobIdentityKeyAndAccountKey.IdentityKey[0].public,
      sign: bobIdentityKeyAndAccountKey.IdentityKey[1],
    }, {
      key: bobIdentityKeyAndAccountKey.AccountKey[0].public,
      sign: bobIdentityKeyAndAccountKey.AccountKey[1],
    }, "bob"],
  ],
  aliceIdentityKeyAndAccountKey.IdentityKey[0],
  [],
)
const seacretText = "Hello, World!"

const encryptedData = await encryptData.encryptDataMlKems(
  seacretText,
  aliceIdentityKeyAndAccountKey.AccountKey[0].public,
)
const decryptedData = await encryptData.decryptDataMlKems(
  encryptedData,
  aliceIdentityKeyAndAccountKey.AccountKey[0],
)

console.log(decryptedData === seacretText)

const messageValue: MessageValue = {
  type: "text",
  message: "Hello, World!",
  version: 1,
}

const encryptedMessage = await EncryptMessage.encryptMessage(
  messageValue,
  "test",
  roomKey.roomKey,
  aliceIdentityKeyAndAccountKey.IdentityKey[0],
  false,
)

const decryptedMessage = await EncryptMessage.decryptMessage(
  encryptedMessage,
  roomKey.roomKey,
  aliceIdentityKeyAndAccountKey.IdentityKey[0].public,
  {
    messageId: "test",
    timestamp: encryptedMessage.timestamp,
    read: false,
  },
)
console.log(decryptedMessage)
