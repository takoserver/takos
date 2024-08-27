import {
  createIdentityKeyAndAccountKey,
  createMasterKey,
  createRoomKey,
  decryptMessage,
  encryptMessage,
} from "./main.ts";
import type { Message } from "./types.ts";

async function main() {
  const masterkey = await createMasterKey();
  const {
    identityKey,
    accountKey: _accountKey,
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
}

main();
