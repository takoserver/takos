import {
  createRoomKey,
  decryptDataRoomKey,
  decryptDataWithAccountKey,
  EncryptedDataRoomKey,
  encryptWithAccountKey,
  generateKeyHashHexJWK,
  isValidAccountKey,
  isValidIdentityKeySign,
  isValidMasterKeyTimeStamp,
  Sign,
  signData,
  verifyData,
} from "@takos/takos-encrypt-ink"
import {
  AccountKey,
  AccountKeyPub,
  EncryptedDataAccountKey,
  IdentityKey,
  IdentityKeyPub,
  MasterKeyPub,
  RoomKey,
} from "@takos/takos-encrypt-ink"
import { createTakosDB, saveToDbAllowKeys } from "./idbSchama.ts"
import { Signal, signal } from "@preact/signals"

interface message {
  messageid: string
  userId: string
  message: string
  timestamp: string
  timestampOriginal: string
  type: string
  verify: number
  identityKeyHashHex: string
  masterKeyHashHex: string
}
type messages = message[]

type identityKeys = {
  [key: string]: IdentityKeyPub[]
}

type roomKeys = {
  roomKey: RoomKey
  userId?: string
  roomid?: string
}[]

type EncryptedRoomKeys = EncryptedDataAccountKey[]

type masterKey = {
  hashHex: string
  masterKey: MasterKeyPub
}

type friendKeyCache = {
  masterKey: Signal<{
    hashHex: string
    masterKey: MasterKeyPub
  }[]>
  identityKey: Signal<{
    userId: string
    hashHex: string
    identityKey: IdentityKeyPub
  }[]>
  accountKey: Signal<{
    userId: string
    accountKey: AccountKeyPub
  }[]>
  roomKey: Signal<{
    userId?: string
    roomid?: string
    roomKey: RoomKey
  }[]>
}
type identityKeyAndAccountKeys = Signal<{
  accountKey: AccountKey
  hashHex: string
  identityKey: IdentityKey
  keyExpiration: string
}[]>

async function addMessages(
  messages: messages,
  identityKeyAndAccountKeys: identityKeyAndAccountKeys,
  friendKeyCache: friendKeyCache,
  EncryptedRoomKeys: EncryptedRoomKeys,
  masterKeys: masterKey[],
  identityKeys: identityKeys,
  EncryptedMessages: {
    messageid: string
    userId: string
    message: {
      signature: Sign
      value: {
        data: EncryptedDataRoomKey
        timestamp: string
      }
    }
    timestamp: string
  }[],
  metaData: {
    roomType: "friend" | "group"
    userId?: string
    roomid?: string
    myUserId: string
  },
) {
  if (metaData.roomType === "group") {
    if (!metaData.roomid) {
      return
    }
  }
  if (metaData.roomType === "friend") {
    if (!metaData.userId) {
      return
    }
  }
  const friendMasterKeyCache = [...friendKeyCache.masterKey.value]
  for (const key of masterKeys) {
    const hashHex = await generateKeyHashHexJWK(key.masterKey)
    if (friendMasterKeyCache.find((data) => data.hashHex === hashHex)) {
      continue
    }
    friendMasterKeyCache.push({
      hashHex,
      masterKey: key.masterKey,
    })
  }
  friendKeyCache.masterKey.value = friendMasterKeyCache
  const friendIdentityKeyCache = [...friendKeyCache.identityKey.value]
  for (const key in identityKeys) {
    for (const identityKey of identityKeys[key]) {
      const hashHex = await generateKeyHashHexJWK(identityKey)
      if (friendIdentityKeyCache.find((data) => data.hashHex === hashHex)) {
        continue
      }
      friendIdentityKeyCache.push({
        userId: key,
        hashHex,
        identityKey,
      })
    }
  }
  friendKeyCache.identityKey.value = friendIdentityKeyCache
  //roomKeyの復号化
  const RoomKeys = []
  for (const EncryptedRoomKey of EncryptedRoomKeys) {
    const accountKey = identityKeyAndAccountKeys.value.find((key) =>
      key.hashHex === EncryptedRoomKey.encryptedKeyHashHex
    )
    if (!accountKey) {
      continue
    }
    const decryptedRommKeyString = await decryptDataWithAccountKey(
      accountKey.accountKey,
      EncryptedRoomKey,
    )
    if (!decryptedRommKeyString) {
      continue
    }
    RoomKeys.push({
      roomKey: JSON.parse(decryptedRommKeyString),
      userId: metaData.userId,
      roomid: metaData.roomid,
    })
  }
  const roomKeyCache = [...friendKeyCache.roomKey.value]
  for (const key of RoomKeys) {
    if (roomKeyCache.find((data) => data.roomKey.hashHex === key.roomKey.hashHex)) {
      continue
    }
    roomKeyCache.push(key)
  }
  friendKeyCache.roomKey.value = roomKeyCache
  if (roomKeyCache.length === 0) {
    updateRoomKey(identityKeyAndAccountKeys, metaData, friendKeyCache)
  }
  const resultRoomKeyArray = await Promise.all(
    RoomKeys.map(async (key) => {
      const hashHex = await generateKeyHashHexJWK(key.roomKey)
      return hashHex === key.roomKey.hashHex ? { key, hashHex } : null
    }),
  ).then((results) => results.filter(Boolean)) // Filter out null results
  //messageの復号化
  const messagesObj = []
  for (const message of EncryptedMessages) {
    const roomKey = resultRoomKeyArray.find(
      (key) => key && String(message.message.value.data.encryptedKeyHashHex) === key.hashHex,
    )?.key
    if (!roomKey) {
      continue
    }
    const decryptedMessage = await decryptDataRoomKey(
      roomKey.roomKey,
      message.message.value.data,
    )
    if (!decryptedMessage) continue
    const messageObj = JSON.parse(decryptedMessage)
    const userIdentityKey = identityKeys[message.userId]
    if (!userIdentityKey) continue
    let identityKey
    for (const key of userIdentityKey) {
      if (await generateKeyHashHexJWK(key) === message.message.signature.hashedPublicKeyHex) {
        identityKey = key
      }
    }
    if (!identityKey) {
      console.error("Identity key not found")
      continue
    }
    const masterKey = await findMasterKey(
      masterKeys,
      identityKey.sign.hashedPublicKeyHex,
    )
    if (!masterKey) {
      console.error("Master key not found")
      continue
    }
    // Verify identity key
    // 0: not verified and not view.
    // 1: not verified and view.
    // 2: verified and view.
    // 3: verified and view and safe.
    const verifyResult = await (async () => {
      const db = await createTakosDB()
      const allowKeys = await db.get("allowKeys", identityKey.sign.hashedPublicKeyHex)
      if (allowKeys) {
        if (masterKey) {
          const verify = await isValidIdentityKeySign(masterKey.masterKey, identityKey)
          const verifyMessage = await verifyData(
            identityKey,
            JSON.stringify(message.message.value),
            message.message.signature,
          )
          if (verify && verifyMessage) {
            if (allowKeys.type === "allow") return 3
            return 2
          } else {
            return 0
          }
        } else {
          console.log("verifyMessage")
          return 0
        }
      } else {
        const verifyMasterKeyValid = await isValidMasterKeyTimeStamp(masterKey.masterKey)
        const verifyIdentityKeyValid = await isValidIdentityKeySign(
          masterKey.masterKey,
          identityKey,
        )
        if (verifyMasterKeyValid && verifyIdentityKeyValid) {
          const verifyMessage = await verifyData(
            identityKey,
            JSON.stringify(message.message.value),
            message.message.signature,
          )
          if (!verifyMessage) return 0
          await saveToDbAllowKeys(
            await generateKeyHashHexJWK(masterKey.masterKey),
            message.userId,
            "recognition",
            masterKey.masterKey.timestamp,
          )
          return 2
        } else {
          return 0
        }
      }
    })()
    if (verifyResult === 0) {
      continue
    }
    if (new Date(message.timestamp) < new Date(messageObj.timestamp)) {
      continue
    }
    if (
      new Date(message.timestamp).getTime() - new Date(messageObj.timestamp).getTime() > 1000 * 60
    ) {
      continue
    }
    messagesObj.push({
      messageid: message.messageid,
      userId: message.userId,
      message: messageObj.message,
      timestamp: message.timestamp,
      timestampOriginal: messageObj.timestamp,
      type: messageObj.type,
      verify: verifyResult,
      identityKeyHashHex: await generateKeyHashHexJWK(identityKey),
      masterKeyHashHex: await generateKeyHashHexJWK(masterKey.masterKey),
    })
  }
  //messageの整合性チェック
  const messageMasterKeyTimestamp: {
    hashHex: string
    timestamp: string
    userId: string
  }[] = []
  for (const [_index, message] of messagesObj.entries()) {
    if (messageMasterKeyTimestamp.find((key) => key.hashHex === message.masterKeyHashHex)) {
      continue
    }
    messageMasterKeyTimestamp.push({
      hashHex: message.masterKeyHashHex,
      timestamp: message.timestamp,
      userId: message.userId,
    })
  }
  messageMasterKeyTimestamp.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
  for (const message of messagesObj) {
    const hashHex = message.masterKeyHashHex
    const timestamp = message.timestamp
    const index = messageMasterKeyTimestamp.findIndex((key) => key.hashHex === hashHex)
    const masterKeyInfo = messageMasterKeyTimestamp[index]
    if (!masterKeyInfo) {
      return
    }
    if (index === 0) {
      continue
    }
    //userIdが同じ場合でindexよりも新しいtimestampを取得
    const newTimestamp = messageMasterKeyTimestamp.find((key) =>
      key.userId === message.userId &&
      new Date(key.timestamp).getTime() > new Date(timestamp).getTime()
    )
    if (newTimestamp) {
      continue
    }
    //timestampが新しいmasterKeyよりも新しいtimestampのmessageは無効
    if (new Date(masterKeyInfo.timestamp).getTime() > new Date(timestamp).getTime()) {
      return
    }
  }
  messages = [...messages, ...messagesObj].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })
}
function findIdentityKey(identityKeys: IdentityKeyPub[], hashHex: string) {
  return identityKeys.find(async (key) => await generateKeyHashHexJWK(key) === hashHex)
}
async function findMasterKey(masterKeys: {
  masterKey: MasterKeyPub
  hashHex: string
}[], hashHex: string) {
  const reuslt = masterKeys.find(
    (key) => key.hashHex === hashHex,
  )
  if (!reuslt) {
    return null
  }
  if (hashHex === await generateKeyHashHexJWK(reuslt.masterKey)) {
    return reuslt
  }
  return null
}


async function updateRoomKey(
    identityKeyAndAccountKeys: identityKeyAndAccountKeys,
    metaData: {
        roomType: "friend" | "group"
        userId?: string
        myUserId: string
    },
    friendKeyCache: friendKeyCache,
) {
    if (metaData.roomType === "friend") {
        const latestIdentityAndAccountKeys = identityKeyAndAccountKeys.value[0]
        const keys = await fetch(
          `/takos/v2/client/users/keys?userId=${metaData.userId}`,
        ).then((res) => res.json())
        const userMasterKey: MasterKeyPub = keys.masterKey
        const db = await createTakosDB()
        const isRegioned = await db.get(
          "allowKeys",
          await generateKeyHashHexJWK(
            keys.masterKey,
          ),
        )
        if (!isRegioned) {
          const verifyMasterKeyValid = await isValidMasterKeyTimeStamp(
            userMasterKey,
          )
          if (!verifyMasterKeyValid) {
            alert("エラーが発生しました")
            return
          }
          const date = userMasterKey.timestamp
          const recognitionKey = JSON.stringify({
            userId: metaData.userId,
            keyHash: await generateKeyHashHexJWK(
              keys.masterKey,
            ),
            type: "recognition",
            timestamp: date,
          })
          const recognitionKeySign = await signData(
            latestIdentityAndAccountKeys.identityKey,
            recognitionKey,
          )
          const res = await fetch(
            "/takos/v2/client/keys/allowKey/recognition",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                key: recognitionKey,
                sign: recognitionKeySign,
              }),
            },
          )
          const data = await res.json()
          if (data.status === false) {
            alert("エラーが発生しました")
            return
          }
          await saveToDbAllowKeys(
            await generateKeyHashHexJWK(
              keys.masterKey,
            ),
            metaData.userId!,
            "recognition",
            date,
          )
        }
        // 一つ次に新しいmasterKeyをidbから取得
        const allowedMasterKeys = await db.getAll(
          "allowKeys",
        )
        const userMasterKeys = allowedMasterKeys.filter(
          (data) => data.allowedUserId === metaData.userId,
        )
        const thisMasterKeyTimeString = (userMasterKeys.find(
          async (data) =>
            data.keyHash ===
              await generateKeyHashHexJWK(userMasterKey),
        ))?.timestamp
        if (!thisMasterKeyTimeString) {
          alert("エラーが発生しました")
          return
        }
        //新しい順にuserMasterKeysを並び替え
        userMasterKeys.sort((a, b) => {
          return new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
        })
        //thisMasterKeyTimeのインデックスを取得
        const thisMasterKeyIndex = userMasterKeys.findIndex(
          (data) => data.timestamp === thisMasterKeyTimeString,
        )
        //一つ次に新しいmasterKeyを取得
        const nextMasterKey = userMasterKeys[thisMasterKeyIndex - 1]
        if (nextMasterKey) {
          const nextMasterKeyTime = new Date(nextMasterKey.timestamp)
          const identityKeyTime = keys.keys[0].timestamp
          if (nextMasterKeyTime < identityKeyTime) {
            alert("エラーが発生しました")
            return
          }
        }
        if (
          !isValidIdentityKeySign(
            userMasterKey,
            keys.keys[0].identityKey,
          )
        ) {
          alert("エラーが発生しました")
          return
        }
        if (
          !isValidAccountKey(
            keys.keys[0].identityKey,
            keys.keys[0].accountKey,
          )
        ) {
          alert("エラーが発生しました")
          return
        }
        const roomKey = await createRoomKey(
          latestIdentityAndAccountKeys.identityKey,
        )
        const encryptedRoomKey = await encryptWithAccountKey(
          keys.keys[0].accountKey,
          JSON.stringify(roomKey),
        )
        const encryptedRoomKeyForMe = await encryptWithAccountKey(
          identityKeyAndAccountKeys.value[0].accountKey
            .public,
          JSON.stringify(roomKey),
        )
        const res = await fetch(
          "/takos/v2/client/talk/data/friend/updateRoomKey",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              friendId: metaData.userId,
              roomKeys: [{
                userId: metaData.userId,
                key: encryptedRoomKey,
              }, {
                userId: metaData.myUserId,
                key: encryptedRoomKeyForMe,
              }],
              keyHashHex: roomKey.hashHex,
            }),
          },
        )
        const data = await res.json()
        if (data.status === false) {
          alert("エラーが発生しました")
        }
        friendKeyCache.roomKey.value.push(
          {
            userId: metaData.userId,
            roomKey,
          },
        )
        return
      }
}