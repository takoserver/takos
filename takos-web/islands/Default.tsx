import { useEffect, useState } from "preact/hooks";
import { AppStateType } from "../util/types.ts";
import { setIschoiseUser } from "../util/takosClient.ts";
import { saveToDbDeviceKey, saveToDbIdentityAndAccountKeys, saveToDbKeyShareKeys, saveToDbMasterKey, TakosDB } from "../util/idbSchama.ts";
import {
  createDeviceKey,
  createIdentityKeyAndAccountKey,
  createKeyShareKey,
  createMasterKey,
  encryptAndSignDataWithKeyShareKey,
  encryptDataDeviceKey,
  generateKeyHashHex,
  decryptDataDeviceKey,
  type deviceKey,
} from "@takos/takos-encrypt-ink";
import { createTakosDB } from "../util/idbSchama.ts";
import getKeys from "../util/getKeys.ts";
import { generate } from "$fresh/src/dev/manifest.ts";
export default function setDefaultState({ state }: { state: AppStateType }) {
  const [setUp, setSetUp] = useState(false);
  const [shareKey , setShareKey] = useState(false);
  const [nickName, setNickName] = useState("");
  const [icon, setIcon] = useState<File | null>(null);
  const [age, setAge] = useState(0);
  async function setDefaultState() {
    const userInfoData = await fetch("/takos/v2/client/profile").then((res) =>
      res.json()
    );
    if (!userInfoData.status) {
      window.location.href = "/";
    }
    if(userInfoData.data.setup) {
      const db = await createTakosDB();
      //get masterKey
      const masterKey = await db.get("masterKey", "masterKey");
      if (!masterKey) {
        setShareKey(true);
        return;
      }
      const deviceKeyPub = await db.get("deviceKey", "deviceKey");
      if(!deviceKeyPub) {
        console.log("deviceKeyPub is not found");
        return;
      }
      const deviceKey: deviceKey = {
        public: deviceKeyPub.deviceKey,
        private: userInfoData.data.devicekey,
        hashHex: await generateKeyHashHex(deviceKeyPub.deviceKey.key),
      };
      const idbIdentityAndAccountKeys = await db.getAll("identityAndAccountKeys");
      //期限が長い順
      idbIdentityAndAccountKeys.sort((a, b) => {
        return new Date(b.keyExpiration).getTime() - new Date(a.keyExpiration).getTime();
      });
      const newKeys = await fetch(
        "/takos/v2/client/profile/keys?hashHex=" +
          idbIdentityAndAccountKeys[0].hashHex,
      ).then((res) => res.json());
      if(!newKeys.status) {
        alert("エラーが発生しました");
        return;
      }
      if(newKeys.data.identityKeyAndAndAccountKey.length === 0) {
        const masterKeyString = await decryptDataDeviceKey(deviceKey, masterKey.masterKey);
        if(!masterKeyString) {
          console.log("masterKeyString is decrypt error");
          return;
        }
        const masterKeyData = JSON.parse(masterKeyString);
        const decryptedIdentityAndAccountKeys = await Promise.all(idbIdentityAndAccountKeys.map(async (key) => {
          console.log(key);
          const identityKey = await decryptDataDeviceKey(deviceKey, key.encryptedIdentityKey);
          const accountKey = await decryptDataDeviceKey(deviceKey, key.encryptedAccountKey);
          if(!identityKey || !accountKey) {
            console.log("identityKey or accountKey is decrypt error");
            return null;
          }
          return {
            identityKey: JSON.parse(identityKey),
            accountKey: JSON.parse(accountKey),
            hashHex: key.hashHex,
            keyExpiration: key.keyExpiration,
          };
        }));
        if(!decryptedIdentityAndAccountKeys) {
          console.log("decryptedIdentityAndAccountKeys is not found");
          return;
        }
        state.IdentityKeyAndAccountKeys.value = decryptedIdentityAndAccountKeys;
        state.MasterKey.value = masterKeyData;
        state.DeviceKey.value = deviceKey;
        state.ws.value = new WebSocket("ws://localhost:8080/ws");
        state.ws.value.onmessage = (event) => {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "requestShareKey":
              requestShareKey(data);
          }
        }
        return;
      }
    } else {
      setSetUp(true);
    }
  }
  useEffect(() => {
    setDefaultState();
  }, []);
  useEffect(() => {
    if (
      state.inputMessage.value && !/^[\n]+$/.test(state.inputMessage.value) &&
      state.inputMessage.value.length <= 100
    ) {
      state.isValidInput.value = true;
    } else {
      state.isValidInput.value = false;
    }
  }, [state.inputMessage.value]);
  return (
    <>
      {shareKey && (
        <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
        <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
          <div class="absolute right-0 top-0 p-4">
            <span
              class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
              onClick={() => {
                setShareKey(false);
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
            <div class="">
              <button
                type="submit"
                class="rounded-lg block mx-auto m-2 text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                onClick={async () => {}}
              >
                他のデバイスにリクエスト
              </button>
              <button
              type="submit"
              class="rounded-lg mx-auto block m-2 text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
              onClick={async () => {}}
              >新しい鍵を作成</button>
            </div>
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
                  setSetUp(false);
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
                          const target = e.target as HTMLInputElement;
                          const file = target.files?.[0];
                          if (!file) {
                            return;
                          }
                          setIcon(file);
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
                          const target = e.target as HTMLInputElement;
                          setNickName(target.value);
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
                          const target = e.target as HTMLInputElement;
                          setAge(parseInt(target.value));
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
                      const icondata = icon;
                      if (!icondata) {
                        return;
                      }
                      const iconFile = icondata;
                      const iconBase64 = await convertFileToBase64(iconFile);
                      if (typeof iconBase64 !== "string") {
                        return;
                      }
                      console.log(iconBase64);
                      const masterKey = await createMasterKey();
                      const { identityKey, accountKey } =
                        await createIdentityKeyAndAccountKey(masterKey);
                      const deviceKey = await createDeviceKey(masterKey);
                      const keyShareKey = await createKeyShareKey(masterKey);
                      const encryptedMasterKey = await encryptDataDeviceKey(
                        deviceKey,
                        JSON.stringify(masterKey),
                      );
                      const encryptedIdentityKey =
                        await encryptAndSignDataWithKeyShareKey(
                          keyShareKey.public,
                          JSON.stringify(identityKey),
                          masterKey,
                        );
                      const encryptedAccountKey =
                        await encryptAndSignDataWithKeyShareKey(
                          keyShareKey.public,
                          JSON.stringify(accountKey),
                          masterKey,
                        );
                      const encryptedKeyShareKey = await encryptDataDeviceKey(
                        deviceKey,
                        JSON.stringify(keyShareKey),
                      );
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
                      );
                      const resJson = await res.json();
                      if (resJson.status) {
                        const encryptedIdentityKeyWithDeviceKey = await encryptDataDeviceKey(deviceKey, JSON.stringify(identityKey));
                        const encryptedAccountKeyWithDeviceKey = await encryptDataDeviceKey(deviceKey, JSON.stringify(accountKey));
                        const hashHex = await generateKeyHashHex(identityKey.public.key);
                        await saveToDbMasterKey(encryptedMasterKey);
                        await saveToDbDeviceKey(deviceKey.public);
                        await saveToDbKeyShareKeys(encryptedKeyShareKey, keyShareKey.hashHex);
                        await saveToDbIdentityAndAccountKeys(encryptedIdentityKeyWithDeviceKey, encryptedAccountKeyWithDeviceKey, hashHex,
                          identityKey.public.keyExpiration
                        );
                        const db = await createTakosDB();
                        console.log(await db.getAll("identityAndAccountKeys"));
                        console.log(await db.getAll("keyShareKeys"));
                        console.log(await db.get("masterKey", "masterKey"));
                        console.log(await db.get("deviceKey", "deviceKey"));
                        setSetUp(false);
                        alert("設定が完了しました");
                      } else {
                        console.log(resJson);
                        alert("エラーが発生しました");
                      }
                    } catch (error) {
                      console.log(error);
                      throw error;
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
    </>
  );
}
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result.split(",")[1]);
      } else {
        reject(new Error("ファイルの変換に失敗しました"));
      }
    };
    reader.onerror = reject;
  });
};

async function requestShareKey(data: any) {
}