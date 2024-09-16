import { useEffect, useState } from "preact/hooks"
import { AppStateType, IdentityKeyAndAccountKeysState } from "../util/types.ts"
import fnv1a from "@sindresorhus/fnv1a"
import {
  saveToDbAllowKeys,
  saveToDbDeviceKey,
  saveToDbIdentityAndAccountKeys,
  saveToDbKeyShareKeys,
  saveToDbMasterKey,
} from "../util/idbSchama.ts"
import { useSignal } from "@preact/signals"
import {
  createDeviceKey,
  createIdentityKeyAndAccountKey,
  createKeyShareKey,
  createMasterKey,
  decryptDataDeviceKey,
  decryptDataWithMigrateKey,
  type deviceKey,
  encryptAndSignDataWithKeyShareKey,
  encryptDataDeviceKey,
  encryptDataWithMigrateKey,
  generateKeyHashHexJWK,
  generateMigrateDataSignKey,
  generateMigrateKey,
  isValidAccountKey,
  isValidIdentityKeySign,
  signDataWithMigrateDataSignKey,
  verifyData,
  verifyDataWithMigrateDataSignKey,
} from "@takos/takos-encrypt-ink"
import type {
  AccountKey,
  IdentityKey,
  migrateDataSignKey,
  migrateDataSignKeyPub,
  migrateKey,
  migrateKeyPub,
} from "@takos/takos-encrypt-ink"
import { createTakosDB } from "../util/idbSchama.ts"
export default function setDefaultState({ state }: { state: AppStateType }) {
  const [setUp, setSetUp] = useState(false)
  const [shareKey, setShareKey] = useState(false)
  const [nickName, setNickName] = useState("")
  const [icon, setIcon] = useState<File | null>(null)
  const [age, setAge] = useState(0)
  const [isShowKeySharePopup, setIsShowKeySharePopup] = useState(false)
  const keyShareSessionId = useSignal("")
  const migrateKeyPublic = useSignal<migrateKeyPub | null>(null)
  const migrateDataSignKeyPublic = useSignal<migrateDataSignKeyPub | null>(
    null,
  )
  const migrateKey = useSignal<migrateKey | null>(null)
  const migrateDataSignKey = useSignal<migrateDataSignKey | null>(null)
  const requester = useSignal(false)
  async function setDefaultState() {
    try {
      const userInfoData = await fetchJson("/takos/v2/client/profile")
      console.log(userInfoData)
      if (!userInfoData.status) {
        return redirectToHome()
      }

      state.userId.value = userInfoData.data.userId

      if (!userInfoData.data.setup) {
        return setSetUp(true)
      }

      const db = await createTakosDB()
      const masterKey = await db.get("masterKey", "masterKey")

      if (!masterKey) {
        return setShareKey(true)
      }

      const deviceKeyPub = await db.get("deviceKey", "deviceKey")

      if (!deviceKeyPub) {
        return
      }

      const deviceKey: deviceKey = {
        public: deviceKeyPub.deviceKey,
        private: userInfoData.data.devicekey,
        hashHex: await generateKeyHashHexJWK(deviceKeyPub.deviceKey),
        version: 1,
      }

      const idbIdentityAndAccountKeys = await fetchAndSortKeys(db)
      const masterKeyData = await decryptMasterKey(deviceKey, masterKey)

      if (!masterKeyData) {
        return console.error("Master key decryption error")
      }

      const filteredKeys = await decryptIdentityAndAccountKeys(
        deviceKey,
        idbIdentityAndAccountKeys,
      )

      if (!filteredKeys.length) {
        return console.error("No valid identity or account keys")
      }

      setStateKeys(filteredKeys, masterKeyData, deviceKey, userInfoData.data.updates)

      const list = await fetchJson("/takos/v2/client/list")
      if (!list.status) {
        return console.error("Friend list not found")
      }

      state.friendList.value = list.result
    } catch (error) {
      console.error("Error setting default state:", error)
    }
  }

  async function fetchJson(url: string) {
    const response = await fetch(url)
    return response.json()
  }

  function redirectToHome() {
    window.location.href = "/"
  }

  async function fetchAndSortKeys(db: any) {
    const keys = await db.getAll("identityAndAccountKeys")
    keys.sort((
      a: { keyExpiration: string | number | Date },
      b: { keyExpiration: string | number | Date },
    ) => new Date(b.keyExpiration).getTime() - new Date(a.keyExpiration).getTime())
    return keys
  }

  async function decryptMasterKey(deviceKey: deviceKey, masterKey: any) {
    const masterKeyString = await decryptDataDeviceKey(deviceKey, masterKey.masterKey)
    return masterKeyString ? JSON.parse(masterKeyString) : null
  }

  async function decryptIdentityAndAccountKeys(deviceKey: deviceKey, keys: any[]) {
    const decryptedKeys = await Promise.all(
      keys.map(async (key) => {
        const [identityKey, accountKey] = await Promise.all([
          decryptDataDeviceKey(deviceKey, key.encryptedIdentityKey),
          decryptDataDeviceKey(deviceKey, key.encryptedAccountKey),
        ])

        if (!identityKey || !accountKey) {
          console.error("Decryption error for identity or account key")
          return null
        }

        return {
          identityKey: JSON.parse(identityKey),
          accountKey: JSON.parse(accountKey),
          hashHex: key.hashHex,
          keyExpiration: key.keyExpiration,
        }
      }),
    )

    return decryptedKeys.filter((key): key is any => key !== null)
  }

  function setStateKeys(filteredKeys: any, masterKeyData: any, deviceKey: any, updates: any) {
    state.IdentityKeyAndAccountKeys.value = filteredKeys
    state.MasterKey.value = masterKeyData
    state.DeviceKey.value = deviceKey

    if (updates.identityKeyAndAccountKey.length !== 0) {
      for (const key of updates.identityKeyAndAccountKey) {
        const identityKey = key.identityKey
        const accountKey = key.accountKey
        const hashHex = key.hashHex
        const timestamp = key.timestamp

        if (!identityKey || !accountKey || !hashHex || !timestamp) {
          continue
        }
        if(!isValidIdentityKeySign(masterKeyData, identityKey)) {
          continue
        }
        if(!isValidAccountKey(identityKey, accountKey)) {
          continue
        }
      }
    }

    if (updates.allowedKey.length !== 0) {
      for (const key of updates.allowedKey) {
        const signKeyhashHex = key.sign.hashedPublicKeyHex
        const signKey = state.IdentityKeyAndAccountKeys.value.find(
          (key: IdentityKeyAndAccountKeysState) => key.hashHex === signKeyhashHex,
        )
        if (!signKey) {
          continue
        }
        if(!verifyData)
      }
    }
  }
  useEffect(() => {
    setDefaultState()
    state.ws.value = new WebSocket("/takos/v2/client/ws")
    state.ws.value.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      console.log(data, requester.value)
      switch (data.type) {
        case "keyShareRequest":
          {
            if (requester.value) break
            setIsShowKeySharePopup(true)
            keyShareSessionId.value = data.keyShareSessionId
          }
          break
        case "keyShareAccept":
          {
            if (!requester.value) break
            const migrateDataSignKeyRes = await fetch(
              "/takos/v2/client/sessions/key/migrateDataSignKey?sessionId=" +
                keyShareSessionId.value,
            ).then((res) => res.json())
            if (!migrateDataSignKeyRes) {
              console.log("migrateDataSignKey is not found")
            } else {
              console.log("public   " + migrateDataSignKey)
              migrateDataSignKeyPublic.value = migrateDataSignKeyRes.migrateDataSignKeyPublic
              const hash = fnv1a(
                JSON.stringify(migrateKey.value?.public) +
                  JSON.stringify(migrateDataSignKeyPublic.value),
                { size: 32 },
              )
              const hashHex = String(Number(hash))
              setCheckKeyCode(hashHex)
              setKeySharePage(3)
            }
          }
          break
        case "keyShareData": {
          if (!requester.value) break
          const res = await fetch(
            "/takos/v2/client/sessions/key/keyShareData?sessionId=" +
              keyShareSessionId.value,
          ).then((res) => res.json())
          if (!res) {
            console.log("keyShareData is not found")
            return
          }
          if (!migrateKey.value) {
            console.log("migrateKey is not found")
            return
          }
          const migrateData = await decryptDataWithMigrateKey(
            migrateKey.value,
            res.data,
          )
          if (!migrateData) {
            console.log("migrateData is decrypt error")
            return
          }
          if (!migrateDataSignKeyPublic.value) {
            console.log("migrateDataSignKey is not found")
            return
          }
          const verify = await verifyDataWithMigrateDataSignKey(
            migrateDataSignKeyPublic.value,
            res.data,
            res.sign,
          )
          if (!verify) {
            console.log("verify is false")
            return
          }
          const db = await createTakosDB()
          const migrateDataJson = JSON.parse(migrateData)
          console.log(migrateDataJson)
          const allowedMasterKeyArray: {
            key?: string
            keyHash: string
            allowedUserId: string
            type: "allow" | "recognition"
            timestamp: string
          }[] = migrateDataJson.allowedMasterKey
          const masterKey = migrateDataJson.masterKeyData
          const identityAndAccountKeys = migrateDataJson.identityAndAccountKeysData
          const deviceKey = await createDeviceKey(masterKey)
          const keyShareKey = await createKeyShareKey(masterKey)
          const encryptedMasterKey = await encryptDataDeviceKey(
            deviceKey,
            JSON.stringify(masterKey),
          )
          const encryptedIdentityAndAccountKeys = await Promise.all(
            (JSON.parse(identityAndAccountKeys)).map(
              async (
                key: {
                  identityKey: any
                  accountKey: any
                  hashHex: any
                  keyExpiration: any
                },
              ) => {
                const encryptedIdentityKey = await encryptDataDeviceKey(
                  deviceKey,
                  JSON.stringify(key.identityKey),
                )
                const encryptedAccountKey = await encryptDataDeviceKey(
                  deviceKey,
                  JSON.stringify(key.accountKey),
                )
                return {
                  encryptedIdentityKey,
                  encryptedAccountKey,
                  hashHex: key.hashHex,
                  keyExpiration: key.keyExpiration,
                }
              },
            ),
          )
          const encryptedKeyShareKey = await encryptDataDeviceKey(
            deviceKey,
            JSON.stringify(keyShareKey),
          )
          //db clear
          await db.clear("config")
          await db.clear("deviceKey")
          await db.clear("identityAndAccountKeys")
          await db.clear("keyShareKeys")
          await db.clear("masterKey")
          //db save
          await saveToDbMasterKey(encryptedMasterKey)
          await saveToDbDeviceKey(deviceKey.public)
          await saveToDbKeyShareKeys(encryptedKeyShareKey, keyShareKey.hashHex)
          await Promise.all(
            encryptedIdentityAndAccountKeys.map(async (key) => {
              await saveToDbIdentityAndAccountKeys(
                key.encryptedIdentityKey,
                key.encryptedAccountKey,
                key.hashHex,
                key.keyExpiration,
              )
            }),
          )
          for (const key of allowedMasterKeyArray) {
            await saveToDbAllowKeys(key.keyHash, key.allowedUserId, key.type, key.timestamp)
          }
          await fetch("/takos/v2/client/keys/allowKey/saved", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              isAll: true,
            }),
          })
          await fetch("/takos/v2/client/sessions/key/updateSessionKeys", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              deviceKeyPrivate: deviceKey.private,
              keyShareKeyPub: keyShareKey.public,
            }),
          })
          setShareKey(false)
          setAcceptKeySharePage(1)
          setKeySharePage(1)
          requester.value = false
          alert("鍵移行が完了しました")
          //リロード
          window.location.reload()
        }
      }
    }
  }, [])
  useEffect(() => {
    if (
      state.inputMessage.value && !/^[\n]+$/.test(state.inputMessage.value) &&
      state.inputMessage.value.length <= 100
    ) {
      state.isValidInput.value = true
    } else {
      state.isValidInput.value = false
    }
  }, [state.inputMessage.value])
  const [keySharePage, setKeySharePage] = useState(1)
  const [acceptKeySharePage, setAcceptKeySharePage] = useState(1)
  const [checkKeyCode, setCheckKeyCode] = useState("")
  return (
    <>
      {shareKey && (
        <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
          <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
            <div class="absolute right-0 top-0 p-4">
              <span
                class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                onClick={() => {
                  setShareKey(false)
                }}
              >
                ×
              </span>
            </div>
            <div class="w-4/5 mx-auto my-auto mt-10 h-full space-y-8 text-center">
              <h1 class="text-center text-2xl text-black dark:text-white hover:underline font-medium">
                鍵移行
              </h1>
              <div class="mt-12">
                <div class="lg:w-1/2 md:w-2/3 w-full m-10 mx-auto">
                  <form>
                  </form>
                </div>
              </div>
              {keySharePage === 1 && (
                <div class="">
                  <button
                    type="submit"
                    class="rounded-lg mx-auto block m-2 text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                    onClick={async () => {
                      const maigrateKeyData = await generateMigrateKey()
                      migrateKey.value = maigrateKeyData
                      console.log(maigrateKeyData)
                      requester.value = true
                      console.log(requester.value)
                      const res = await fetch(
                        "/takos/v2/client/sessions/key/requestKeyShare",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            migrateKey: maigrateKeyData.public,
                          }),
                        },
                      )
                      const resJson = await res.json()
                      if (resJson.status) {
                        keyShareSessionId.value = resJson.sessionId
                        console.log(resJson.sessionId)
                        setKeySharePage(2)
                      } else {
                        requester.value = false
                        console.log(resJson)
                        alert("エラーが発生しました")
                      }
                    }}
                  >
                    他のデバイスにリクエスト
                  </button>
                  <button
                    type="submit"
                    class="rounded-lg block mx-auto m-2 text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                    onClick={async () => {
                      const db = await createTakosDB()
                      await db.clear("config")
                      await db.clear("deviceKey")
                      await db.clear("identityAndAccountKeys")
                      await db.clear("keyShareKeys")
                      await db.clear("masterKey")
                      const masterKey = await createMasterKey()
                      const { identityKey, accountKey } = await createIdentityKeyAndAccountKey(
                        masterKey,
                      )
                      const deviceKey = await createDeviceKey(masterKey)
                      const keyShareKey = await createKeyShareKey(masterKey)
                      const encryptedMasterKey = await encryptDataDeviceKey(
                        deviceKey,
                        JSON.stringify(masterKey),
                      )
                      const encryptedIdentityKey = await encryptAndSignDataWithKeyShareKey(
                        keyShareKey.public,
                        JSON.stringify(identityKey),
                        masterKey,
                      )
                      const encryptedAccountKey = await encryptAndSignDataWithKeyShareKey(
                        keyShareKey.public,
                        JSON.stringify(accountKey),
                        masterKey,
                      )
                      const encryptedKeyShareKey = await encryptDataDeviceKey(
                        deviceKey,
                        JSON.stringify(keyShareKey),
                      )
                      const res = await fetch(
                        "/takos/v2/client/profile/resetKey",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            account_key: accountKey.public,
                            identity_key: identityKey.public,
                            master_key: masterKey.public,
                            device_key: deviceKey.private,
                            keyShareKey: keyShareKey.public,
                            encryptedIdentityKey: encryptedIdentityKey,
                            encryptedAccountKey: encryptedAccountKey,
                          }),
                        },
                      )
                      const resJson = await res.json()
                      if (resJson.status) {
                        const encryptedIdentityKeyWithDeviceKey = await encryptDataDeviceKey(
                          deviceKey,
                          JSON.stringify(identityKey),
                        )
                        const encryptedAccountKeyWithDeviceKey = await encryptDataDeviceKey(
                          deviceKey,
                          JSON.stringify(accountKey),
                        )
                        const hashHex = await generateKeyHashHexJWK(
                          identityKey.public,
                        )
                        await saveToDbMasterKey(encryptedMasterKey)
                        await saveToDbDeviceKey(deviceKey.public)
                        await saveToDbKeyShareKeys(
                          encryptedKeyShareKey,
                          keyShareKey.hashHex,
                        )
                        await saveToDbIdentityAndAccountKeys(
                          encryptedIdentityKeyWithDeviceKey,
                          encryptedAccountKeyWithDeviceKey,
                          hashHex,
                          identityKey.public.keyExpiration,
                        )
                        const db = await createTakosDB()
                        console.log(await db.getAll("identityAndAccountKeys"))
                        console.log(await db.getAll("keyShareKeys"))
                        console.log(await db.get("masterKey", "masterKey"))
                        console.log(await db.get("deviceKey", "deviceKey"))
                        setShareKey(false)
                        alert("設定が完了しました")
                      } else {
                        console.log(resJson)
                        alert("エラーが発生しました")
                      }
                    }}
                  >
                    新しい鍵を作成
                  </button>
                </div>
              )}
              {keySharePage === 2 && (
                <div class="flex w-full h-full">
                  <p class="m-auto">他のデバイスからの承認を待機中</p>
                </div>
              )}
              {keySharePage === 3 && (
                <div class="w-full h-full">
                  <p class="m-auto">
                    この数字を相手のデバイスに打ち込んでください
                  </p>
                  <p class="m-auto">{checkKeyCode}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {setUp && (
        <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
          <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
            <div class="absolute right-0 top-0 p-4">
              <span
                class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                onClick={() => {
                  setSetUp(false)
                }}
              >
                ×
              </span>
            </div>
            <div class="w-4/5 mx-auto my-auto mt-10 h-full space-y-8 text-center">
              <h1 class="text-center text-2xl text-black dark:text-white hover:underline font-medium">
                初期設定
              </h1>
              <div class="mt-12">
                {/*アイコン、ニックネーム、年齢*/}
                <div class="lg:w-1/2 md:w-2/3 w-full m-10 mx-auto">
                  <form>
                    {/* アイコンアップロード */}
                    <div class="mb-6">
                      <label
                        class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
                        for="icon"
                      >
                        アイコン
                      </label>
                      <input
                        class="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        id="icon"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          //ファイルをiconにセット
                          const target = e.target as HTMLInputElement
                          const file = target.files?.[0]
                          if (!file) {
                            return
                          }
                          setIcon(file)
                        }}
                      />
                    </div>

                    {/* ニックネーム */}
                    <div class="mb-6">
                      <label
                        class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
                        for="nickname"
                      >
                        ニックネーム
                      </label>
                      <input
                        class="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        id="nickname"
                        type="text"
                        placeholder="ニックネームを入力"
                        value={nickName}
                        onChange={(e) => {
                          const target = e.target as HTMLInputElement
                          setNickName(target.value)
                        }}
                      />
                    </div>

                    {/* 年齢 */}
                    <div class="mb-6">
                      <label
                        class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
                        for="age"
                      >
                        年齢
                      </label>
                      <input
                        class="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        id="age"
                        type="number"
                        placeholder="年齢を入力"
                        onChange={(e) => {
                          const target = e.target as HTMLInputElement
                          setAge(parseInt(target.value))
                        }}
                      />
                    </div>
                  </form>
                </div>
              </div>
              <div class="flex">
                <button
                  type="submit"
                  class="rounded-lg mx-auto text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                  onClick={async () => {
                    try {
                      //iconをbase64に変換
                      const icondata = icon
                      if (!icondata) {
                        return
                      }
                      const iconFile = icondata
                      const iconBase64 = await convertFileToBase64(iconFile)
                      if (typeof iconBase64 !== "string") {
                        return
                      }
                      const masterKey = await createMasterKey()
                      const { identityKey, accountKey } = await createIdentityKeyAndAccountKey(
                        masterKey,
                      )
                      const deviceKey = await createDeviceKey(masterKey)
                      const keyShareKey = await createKeyShareKey(masterKey)
                      const encryptedMasterKey = await encryptDataDeviceKey(
                        deviceKey,
                        JSON.stringify(masterKey),
                      )
                      const encryptedIdentityKey = await encryptAndSignDataWithKeyShareKey(
                        keyShareKey.public,
                        JSON.stringify(identityKey),
                        masterKey,
                      )
                      const encryptedAccountKey = await encryptAndSignDataWithKeyShareKey(
                        keyShareKey.public,
                        JSON.stringify(accountKey),
                        masterKey,
                      )
                      const encryptedKeyShareKey = await encryptDataDeviceKey(
                        deviceKey,
                        JSON.stringify(keyShareKey),
                      )
                      const res = await fetch(
                        "/takos/v2/client/sessions/registers/setup",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            nickName: nickName,
                            icon: iconBase64,
                            age: age,
                            account_key: accountKey.public,
                            identity_key: identityKey.public,
                            master_key: masterKey.public,
                            device_key: deviceKey.private,
                            keyShareKey: keyShareKey.public,
                            encryptedIdentityKey: encryptedIdentityKey,
                            encryptedAccountKey: encryptedAccountKey,
                          }),
                        },
                      )
                      const resJson = await res.json()
                      if (resJson.status) {
                        const encryptedIdentityKeyWithDeviceKey = await encryptDataDeviceKey(
                          deviceKey,
                          JSON.stringify(identityKey),
                        )
                        const encryptedAccountKeyWithDeviceKey = await encryptDataDeviceKey(
                          deviceKey,
                          JSON.stringify(accountKey),
                        )
                        const hashHex = await generateKeyHashHexJWK(
                          identityKey.public,
                        )
                        await saveToDbMasterKey(encryptedMasterKey)
                        await saveToDbDeviceKey(deviceKey.public)
                        await saveToDbKeyShareKeys(
                          encryptedKeyShareKey,
                          keyShareKey.hashHex,
                        )
                        await saveToDbIdentityAndAccountKeys(
                          encryptedIdentityKeyWithDeviceKey,
                          encryptedAccountKeyWithDeviceKey,
                          hashHex,
                          identityKey.public.keyExpiration,
                        )
                        const db = await createTakosDB()
                        console.log(await db.getAll("identityAndAccountKeys"))
                        console.log(await db.getAll("keyShareKeys"))
                        console.log(await db.get("masterKey", "masterKey"))
                        console.log(await db.get("deviceKey", "deviceKey"))
                        const res = await fetch("/takos/v2/client/profile/keys/geted", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            hashHex: hashHex,
                            type: "identityKeyAndAccountKey",
                          }),
                        })
                        if (!res.status) {
                          console.log("identityKeyAndAccountKey is not found")
                        }
                        setSetUp(false)
                        alert("設定が完了しました")
                      } else {
                        console.log(resJson)
                        alert("エラーが発生しました")
                      }
                    } catch (error) {
                      console.log(error)
                      throw error
                    }
                  }}
                >
                  送信
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isShowKeySharePopup && (
        <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
          <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-md max-h-[350px] w-full h-full rounded-xl shadow-lg relative p-5">
            <div class="absolute right-0 top-0 p-4">
              <span
                class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                onClick={() => {
                  setIsShowKeySharePopup(false)
                }}
              >
                ×
              </span>
            </div>
            {acceptKeySharePage === 1 && (
              <form
                class="h-full px-2 lg:px-3 flex flex-col"
                // deno-lint-ignore require-await
                onSubmit={async (e) => {
                  e.preventDefault()
                }}
              >
                <div class="text-sm">
                  <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
                    鍵共有リクエスト
                  </p>
                </div>

                <div class="flex h-full">
                  <button
                    type="submit"
                    class="rounded-lg m-auto text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                    onClick={async () => {
                      const migrateKeyData = await fetch(
                        "/takos/v2/client/sessions/key/migrateKey?sessionId=" +
                          keyShareSessionId.value,
                      ).then((res) => res.json())
                      if (!migrateKeyData.status) {
                        console.log("migrateKey is not found")
                        return
                      }
                      console.log(migrateKeyData)
                      migrateKeyPublic.value = migrateKeyData.migrateKeyPublic
                      const migrateDataSignKeyData = await generateMigrateDataSignKey()
                      migrateDataSignKey.value = migrateDataSignKeyData
                      const res = await fetch(
                        "/takos/v2/client/sessions/key/acceptKeyShareRequest",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            sessionId: keyShareSessionId.value,
                            migrateDataSignKey: migrateDataSignKeyData.public,
                          }),
                        },
                      )
                      const resJson = await res.json()
                      if (resJson.status) {
                        setAcceptKeySharePage(2)
                      } else {
                        console.log(resJson)
                        alert("エラーが発生しました")
                      }
                      setAcceptKeySharePage(2)
                    }}
                  >
                    {"承認"}
                  </button>
                </div>
              </form>
            )}
            {acceptKeySharePage === 2 && (
              <form
                class="h-full px-2 lg:px-3 flex flex-col"
                onSubmit={async (e) => {
                  e.preventDefault()
                  console.log(
                    migrateDataSignKey.value?.public,
                    checkKeyCode,
                    migrateKeyPublic.value,
                  )
                  if (
                    !migrateDataSignKey.value?.public || !checkKeyCode ||
                    !migrateKeyPublic.value
                  ) {
                    return
                  }
                  console.log(
                    migrateKeyPublic.value,
                    migrateDataSignKeyPublic.value,
                  )
                  const hash = fnv1a(
                    JSON.stringify(migrateKeyPublic.value) +
                      JSON.stringify(migrateDataSignKey.value.public),
                    { size: 32 },
                  )
                  const hashHex = String(Number(hash))
                  if (hashHex !== checkKeyCode) {
                    alert("確認コードが間違っています")
                    return
                  }
                  const db = await createTakosDB()
                  const masterKey = await db.get("masterKey", "masterKey")
                  const deviceKeyPub = await db.get("deviceKey", "deviceKey")
                  const identityKeyAndAndAccountKeys = await db.getAll(
                    "identityAndAccountKeys",
                  )
                  const userInfo = await fetch("/takos/v2/client/profile").then(
                    (res) => res.json(),
                  )
                  const deviceKeyPrivate = userInfo.data.devicekey
                  if (
                    !masterKey || !deviceKeyPub || !identityKeyAndAndAccountKeys
                  ) {
                    console.log(
                      "masterKey or deviceKeyPub or identityKeyAndAndAccountKeys is not found",
                    )
                    return
                  }
                  const deviceKey = {
                    public: deviceKeyPub.deviceKey,
                    private: deviceKeyPrivate,
                    hashHex: await generateKeyHashHexJWK(
                      deviceKeyPub.deviceKey,
                    ),
                    version: 1,
                  }
                  const decryptedMasterKey = await decryptDataDeviceKey(
                    deviceKey,
                    masterKey.masterKey,
                  )
                  if (!decryptedMasterKey) {
                    console.log("decryptedMasterKey is decrypt error")
                    return
                  }
                  console.log("うごいてるぜ☆")
                  const masterKeyData = JSON.parse(decryptedMasterKey)
                  const decryptedIdentityAndAccountKeys = await Promise.all(
                    identityKeyAndAndAccountKeys.map(async (key) => {
                      const identityKey = await decryptDataDeviceKey(
                        deviceKey,
                        key.encryptedIdentityKey,
                      )
                      const accountKey = await decryptDataDeviceKey(
                        deviceKey,
                        key.encryptedAccountKey,
                      )
                      if (!identityKey || !accountKey) {
                        console.log(
                          "identityKey or accountKey is decrypt error",
                        )
                        return null
                      }
                      return {
                        identityKey: JSON.parse(identityKey),
                        accountKey: JSON.parse(accountKey),
                        hashHex: key.hashHex,
                        keyExpiration: key.keyExpiration,
                      }
                    }),
                  )
                  console.log("うごいてるぜ☆")
                  const identityAndAccountKeysData = JSON.stringify(
                    decryptedIdentityAndAccountKeys.filter((key) => key !== null),
                  )
                  const allowedMasterKey = await db.getAll("allowKeys")
                  const resData = JSON.stringify({
                    masterKeyData,
                    identityAndAccountKeysData,
                    allowedMasterKey,
                  })
                  if (!migrateKeyPublic.value || !migrateDataSignKey.value) {
                    return
                  }
                  const encryptedResData = await encryptDataWithMigrateKey(
                    migrateKeyPublic.value,
                    resData,
                  )
                  const sign = await signDataWithMigrateDataSignKey(
                    migrateDataSignKey.value,
                    encryptedResData,
                  )
                  const res = await fetch(
                    "/takos/v2/client/sessions/key/sendKeyShareData",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        sign,
                        data: encryptedResData,
                        sessionId: keyShareSessionId.value,
                      }),
                    },
                  )
                  const resJson = await res.json()
                  if (resJson.status) {
                    alert("鍵共有が完了しました")
                    requester.value = false
                    setIsShowKeySharePopup(false)
                  }
                }}
              >
                <div class="text-sm">
                  <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
                    鍵共有リクエスト
                  </p>
                </div>
                <div class="flex flex-col">
                  <label
                    for="email"
                    class="block mb-2 text-sm font-medium text-black dark:text-white"
                  >
                    確認コード
                  </label>
                  <div class="w-full mb-2">
                    <input
                      class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
                      onChange={(e) => {
                        if (!e.target) {
                          return
                        }
                        const target = e.target as HTMLInputElement
                        setCheckKeyCode(target.value)
                      }}
                      placeholder={"xxxxxxxxxx"}
                      type={"text"}
                    />
                  </div>
                </div>
                <div class="flex justify-end w-full pt-2 gap-1">
                  <button
                    type="submit"
                    class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                  >
                    {"送信"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result.split(",")[1])
      } else {
        reject(new Error("ファイルの変換に失敗しました"))
      }
    }
    reader.onerror = reject
  })
}
