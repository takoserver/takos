import { createIdentityKeyAndAccountKey,encryptDataRoomKey, createMasterKey, createMessageBlock, createRoomKey, Message, messageBlock,verifyAndDecryptMessageChain } from "./main.ts"
import { RoomKey } from "./types.ts"

const test = async () => {
  const tako = await createMasterKey();
  const ika = await createMasterKey();
  const takoIdentityKeys = await (async () => {
    const keys = [];
    for (let i = 0; i < 5; i++) {
      keys.push(await ((await createIdentityKeyAndAccountKey(tako)).identityKey));
    }
    return keys;
  })()
  const ikaIdentityKeys = await (async () => {
    const keys = [];
    for (let i = 0; i < 5; i++) {
      keys.push(await ((await createIdentityKeyAndAccountKey(ika)).identityKey));
    }
    return keys;
  })()
  const takoIdentityKeyPubs = takoIdentityKeys.map((key) => key.public);
  const ikaIdentityKeyPubs = ikaIdentityKeys.map((key) => key.public);
  const roomKey = await createRoomKey(takoIdentityKeys[0]);
  const roomKey2 = await createRoomKey(ikaIdentityKeys[0]);

  //かかる時間を計測
  const start = performance.now();

  const messagesChain = await (async (): Promise<messageBlock[]> => {
    const message: Message = {
      message: "string",
      type: "text",
      timestamp: new Date().toISOString(),
      version: 1,
    };
    //takoとikaが交互にメッセージを送る
    const messages: messageBlock[] = [];
    for (let i = 0; i < 5; i++) {
      messages.push(await createMessageBlock(await encryptDataRoomKey(roomKey, JSON.stringify(message)), takoIdentityKeys[i], messages[i - 1]));
      messages.push(await createMessageBlock(await encryptDataRoomKey(roomKey2, JSON.stringify(message)), ikaIdentityKeys[i], messages[i]));
    }
    return messages;
  })()
  const messages = await verifyAndDecryptMessageChain(messagesChain.map((messageBlock, index) => {
    return {
      messageBlock: messageBlock,
      sender: index % 2 === 0 ? "tako" : "ika",
    }
  }), {
    tako: takoIdentityKeyPubs,
    ika: ikaIdentityKeyPubs,
  }, [roomKey, roomKey2]);
  const end = performance.now();
  console.log(messages);
  console.log("Time:", (end - start) / 1000 + "s");
}

test();