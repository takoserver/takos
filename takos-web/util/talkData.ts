import {
  createRoomKey,
  decryptDataRoomKey,
  decryptDataWithAccountKey,
  EncryptedDataRoomKey,
  EncryptedMessage,
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
import { AppStateType } from "./types.ts"
export async function addMessage(
  state: AppStateType,
  talkData: {
    status: boolean
    keys: EncryptedDataAccountKey[]
    identityKeys: {
      [key: string]: IdentityKeyPub[]
    }
    masterKey: {
      masterKey: MasterKeyPub
      hashHex: string
    }[]
    messages: {
      messageid: string
      userId: string
      message: EncryptedMessage
      timestamp: string
    }[]
  },
  metaData: {
    roomType: "friend" | "group"
    friendid?: string
    roomid?: string
    myUserId: string
  },
): Promise<true | false | undefined> {
  if (!talkData.masterKey) {
    talkData.masterKey = []
  }
  console.log(talkData)
  const talkDataTemp = [...state.talkData.value]
  const { myUserId, roomid, friendid, roomType } = metaData
  if (talkData.status === false) {
    throw new Error("talkData.status is false")
  }
  if (roomType === "friend" && friendid === undefined) {
    throw new Error("friendid is undefined")
  }
  if (roomType === "group" && roomid === undefined) {
    throw new Error("roomid is undefined")
  }
  if (roomType === "friend") {
    const roomKeys = await Promise.all(
      talkData.keys.map(async (key: EncryptedDataAccountKey) => {
        const accountKey = state.IdentityKeyAndAccountKeys.value.find(
          (key2: { hashHex: string }) => {
            return key2.hashHex === key.encryptedKeyHashHex
          },
        )
        if (!accountKey) {
          return
        }
        const decryptedRoomKeyString = await decryptDataWithAccountKey(accountKey.accountKey, key)
        if (!decryptedRoomKeyString) {
          console.error("Failed to decrypt room key")
          return
        }
        return {
          userId: metaData.friendid,
          roomid: metaData.roomid,
          roomKey: JSON.parse(decryptedRoomKeyString),
        }
      }),
    ).then((keys) => keys.filter((key) => !!key))
    console.log(roomKeys)
    const resultRoomKeyArray = await Promise.all(
      [
        ...state.friendKeyCache.roomKey.value,
        ...roomKeys,
      ].map(async (key) => {
        const hashHex = await generateKeyHashHexJWK(key.roomKey)
        return hashHex === key.roomKey.hashHex ? { key, hashHex } : null
      }),
    ).then((results) => results.filter(Boolean)) // Filter out null results
    if (resultRoomKeyArray.length === 0) {
      updateRoomKey(state, metaData)
    }
    state.friendKeyCache.roomKey.value = [
      ...state.friendKeyCache.roomKey.value,
      ...roomKeys,
    ]
    const db = await createTakosDB()
    let allowKeys = await db.getAll("allowKeys")
    const masterKeyRsult: {
      hashHex: string
      masterKey: MasterKeyPub
    }[] = []
    const identityKeyResult = []
    for (const key in talkData.identityKeys) {
      const identityKeys = talkData.identityKeys[key]
      const userId = key
      for (const identityKey of identityKeys) {
        const hashHex = await generateKeyHashHexJWK(identityKey)
        let masterKey = masterKeyRsult.find(
          (data) => data.hashHex === identityKey.sign.hashedPublicKeyHex,
        )
        if (!masterKey) {
          const findMasterKeyResult = await findMasterKey(
            [...talkData.masterKey, ...state.friendKeyCache.masterKey.value],
            identityKey.sign.hashedPublicKeyHex,
          )
          if (!findMasterKeyResult) {
            console.log([...talkData.masterKey, ...state.friendKeyCache.masterKey.value])
            console.log(identityKey.sign.hashedPublicKeyHex)
            continue
          }
          masterKey = findMasterKeyResult
        }
        if (!masterKey) {
          continue
        }
        if (!isValidIdentityKeySign(masterKey.masterKey, identityKey)) {
          continue
        }
        let allowKey
        for (const key of allowKeys) {
          if (key.keyHash === await generateKeyHashHexJWK(masterKey.masterKey)) {
            allowKey = key
          }
        }
        if (!allowKey) {
          if (userId === state.userId.value) {
            const myMasterKey = state.MasterKey.value
            const hashHexMyMasterKey = await generateKeyHashHexJWK(myMasterKey.public)
            const hashHexThisMasterKey = await generateKeyHashHexJWK(masterKey.masterKey)
            if (hashHexMyMasterKey === hashHexThisMasterKey) {
              await saveToDbAllowKeys(
                hashHexThisMasterKey,
                userId,
                "allow",
                masterKey.masterKey.timestamp,
              )
            } else {
              await saveToDbAllowKeys(
                hashHexThisMasterKey,
                userId,
                "recognition",
                masterKey.masterKey.timestamp,
              )
            }
          } else {
            await saveToDbAllowKeys(
              await generateKeyHashHexJWK(masterKey.masterKey),
              userId,
              "recognition",
              masterKey.masterKey.timestamp,
            )
          }
          allowKeys = await db.getAll("allowKeys")
        }
        identityKeyResult.push({
          userId,
          hashHex,
          identityKey,
        })
        masterKeyRsult.push(masterKey)
      }
    }
    state.friendKeyCache.identityKey.value = [
      ...state.friendKeyCache.identityKey.value,
      ...identityKeyResult,
    ]
    state.friendKeyCache.masterKey.value = [
      ...state.friendKeyCache.masterKey.value,
      ...masterKeyRsult,
    ]
    for (const message of talkData.messages) {
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
      let identityKey
      for (const key of state.friendKeyCache.identityKey.value) {
        if (
          await generateKeyHashHexJWK(key.identityKey) ===
            message.message.signature.hashedPublicKeyHex
        ) {
          identityKey = key
        }
      }
      if (!identityKey) {
        console.error("Identity key not found")
        continue
      }
      // Verify identity key
      // 0: not verified and not view.
      // 1: not verified and view.
      // 2: verified and view.
      // 3: no encrypted.
      const masterKey = await findMasterKey(
        state.friendKeyCache.masterKey.value,
        identityKey.identityKey.sign.hashedPublicKeyHex,
      )
      if (!masterKey) {
        return false
      }
      const verifyResult = await (async () => {
        let messageAlowKeyInfo
        for (const key of allowKeys) {
          if (key.keyHash === identityKey.identityKey.sign.hashedPublicKeyHex) {
            messageAlowKeyInfo = key
          }
        }
        if (!messageAlowKeyInfo) {
          return 0
        }
        // get identity key
        let messageIdentityKey
        for (const key of state.friendKeyCache.identityKey.value) {
          if (
            key.hashHex === message.message.signature.hashedPublicKeyHex &&
            key.userId === message.userId
          ) {
            messageIdentityKey = key
          }
        }
        if (!messageIdentityKey) {
          return 0
        }
        // verify identity key
        if (
          !await verifyData(
            messageIdentityKey.identityKey,
            JSON.stringify(message.message.value),
            message.message.signature,
          )
        ) {
          return 0
        }
        if (messageAlowKeyInfo.allowedUserId !== message.userId) {
          return 0
        }
        if (messageAlowKeyInfo.type === "recognition") {
          return 1
        }
        return 2
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
      talkDataTemp.push({
        messageid: message.messageid,
        userId: message.userId,
        message: messageObj.message,
        timestamp: message.timestamp,
        timestampOriginal: messageObj.timestamp,
        type: messageObj.type,
        verify: verifyResult,
        identityKeyHashHex: await generateKeyHashHexJWK(identityKey.identityKey),
        masterKeyHashHex: await generateKeyHashHexJWK(masterKey.masterKey),
      })
    }
    //message整合性チェック
    const messageMasterKeyTimestamp: {
      hashHex: string
      timestamp: string
      userId: string
    }[] = []
    for (const [_index, message] of talkDataTemp.entries()) {
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
    for (const message of talkDataTemp) {
      const hashHex = message.masterKeyHashHex
      const timestamp = message.timestamp
      const index = messageMasterKeyTimestamp.findIndex((key) => key.hashHex === hashHex)
      const masterKeyInfo = messageMasterKeyTimestamp[index]
      if (!masterKeyInfo) {
        return false
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
        return false
      }
    }
    state.talkData.value = talkDataTemp.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })
    return true
  }
}
function findIdentityKey(identityKeys: IdentityKeyPub[], hashHex: string) {
  return identityKeys.find(async (key) => await generateKeyHashHexJWK(key) === hashHex)
}
async function findMasterKey(masterKeys: {
  masterKey: MasterKeyPub
  hashHex: string
}[], hashHex: string): Promise<
  {
    masterKey: MasterKeyPub
    hashHex: string
  } | null
> {
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
  state: AppStateType,
  metaData: {
    roomType: "friend" | "group"
    friendid?: string
    roomid?: string
    myUserId: string
  },
) {
  if (metaData.roomType === "friend") {
    if (!metaData.friendid) {
      throw new Error("friendid is undefined")
    }
    console.log("roomKeys is empty")
    const latestIdentityAndAccountKeys = state.IdentityKeyAndAccountKeys.value[0]
    const keys = await fetch(
      `/takos/v2/client/users/keys?userId=${metaData.friendid}`,
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
        userId: metaData.friendid,
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
        metaData.friendid,
        "recognition",
        date,
      )
    }
    // 一つ次に新しいmasterKeyをidbから取得
    const allowedMasterKeys = await db.getAll(
      "allowKeys",
    )
    const userMasterKeys = allowedMasterKeys.filter(
      (data) => data.allowedUserId === metaData.friendid,
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
      state.IdentityKeyAndAccountKeys.value[0].accountKey
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
          friendId: metaData.friendid,
          roomKeys: [{
            userId: metaData.friendid,
            key: encryptedRoomKey,
          }, {
            userId: state.userId.value,
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
    state.friendKeyCache.roomKey.value.push(
      {
        userId: metaData.friendid,
        roomid: metaData.roomid,
        roomKey,
      },
    )
    return
  }
}
