import {
  createIdentityKeyAndAccountKey,
  createMasterKey,
  createRoomKey,
  decryptDataWithAccountKey,
  decryptMessage,
  encryptMessage,
  encryptWithAccountKey,
} from "./main.ts";
import type { Message } from "./types.ts";

async function main() {
  const masterkey = await createMasterKey();
  const {
    identityKey,
    accountKey: accountKey,
  } = await createIdentityKeyAndAccountKey(masterkey);

  const roomKey = await createRoomKey(identityKey);

  const message = "Hello, World!";

  const messageObj: Message = {
    message,
    type: "text",
    timestamp: new Date().toISOString(),
    version: 1,
  };
  const encryptedMessage = await encryptMessage(
    messageObj,
    roomKey,
    identityKey,
  );

  const decryptedMessage = await decryptMessage(
    encryptedMessage,
    roomKey,
    identityKey.public,
  );
  console.log(decryptedMessage);

  const encryptedRoomKey = await encryptWithAccountKey(
    accountKey.public,
    JSON.stringify(roomKey),
  )
  const decryptedRoomKeyData = await decryptDataWithAccountKey(accountKey, encryptedRoomKey)
  if(decryptedRoomKeyData === null) {
    throw new Error("Failed to decrypt room key")
  }
  const decryptedRoomKey = JSON.parse(decryptedRoomKeyData)
  console.log(JSON.stringify(roomKey) === JSON.stringify(decryptedRoomKey))
}

main();
