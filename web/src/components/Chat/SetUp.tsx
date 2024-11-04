import {
  deviceKeyState,
  domainState,
  sessionidState,
  setUpState,
} from "../../utils/state";
import { useAtom } from "solid-jotai";
import { PopUpFrame } from "./setupPopup/popUpFrame";
import { createEffect, createSignal } from "solid-js";
import { arrayBufferToBase64 } from "../../utils/buffers";
import {
  encryptDataDeviceKey,
  generateIdentityKeyAndAccountKey,
  generateKeyShareKeys,
  generateMasterKey,
  keyHash,
} from "@takos/takos-encrypt-ink";
import { uuidv7 } from "uuidv7";
import { requester } from "../../utils/requester";
import { createTakosDB, localStorageEditor } from "../../utils/idb";

export function SetUp() {
  const [setUp, setSetUp] = useAtom(setUpState);
  const [isOpen, setIsOpen] = createSignal(false);
  const [setted, setSetted] = createSignal(false);

  const [nickname, setNickname] = createSignal("");
  const [birthday, setBirthday] = createSignal("");
  const [icon, setIcon] = createSignal<File | null>(null);
  const [domain] = useAtom(domainState);
  const [sessionid] = useAtom(sessionidState);
  const [deviceKey] = useAtom(deviceKeyState);
  createEffect(() => {
    if (!setUp() && !setted()) {
      setIsOpen(true);
      setSetUp(true);
    }
  });
  return (
    <>
      {isOpen() && (
        <PopUpFrame closeScript={setIsOpen}>
          <div class="h-full w-full flex items-center justify-center">
            <div class="max-w-md w-full px-6">
              <h1 class="text-2xl font-semibold text-center mb-6">
                セットアップ
              </h1>
              <form
                class="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const serverDomain = domain();
                  const sessionidS = sessionid();
                  const deviceKeyS = deviceKey();
                  if (!serverDomain || !sessionidS || !deviceKeyS) return;
                  if (nickname() && birthday() && icon()) {
                    // FileをarrayBufferに変換
                    const file = icon();
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const inputIcon = reader.result;
                      const icon = arrayBufferToBase64(
                        inputIcon as ArrayBuffer,
                      );
                      const masterKey = generateMasterKey();
                      const identityKey = generateIdentityKeyAndAccountKey(
                        masterKey,
                      );
                      const sessionUUID = uuidv7();
                      const keyShareKeys = await generateKeyShareKeys(
                        masterKey,
                        sessionUUID,
                      );
                      const keyShareKey = keyShareKeys.keyShareKey;
                      const keyShareSignKey = keyShareKeys.keyShareSignKey;
                      const response = await requester(serverDomain, "setUp", {
                        masterKey: masterKey.public,
                        identityKey: (await identityKey).identityKey.public,
                        accountKey: (await identityKey).accountKey.public,
                        nickName: nickname(),
                        icon: icon,
                        birthday: birthday(),
                        keyShareKey: keyShareKey.public,
                        keyShareSignKey: keyShareSignKey.public,
                        identityKeySign: (await identityKey).identityKey.sign,
                        accountKeySign: (await identityKey).accountKey.sign,
                        keyShareKeySign: keyShareKey.sign,
                        keyShareSignKeySign: keyShareSignKey.sign,
                        sessionUUID: sessionUUID,
                        sessionid: sessionidS,
                      });
                      const idenKeyHash = await keyHash(
                        (await identityKey).identityKey.public,
                      );
                      const idenTimestamp =
                        (JSON.parse((await identityKey).identityKey.public))
                          .timestamp;
                      const keyShareKeyHash = await keyHash(keyShareKey.public);
                      const keyShareTimestamp =
                        (JSON.parse(keyShareKey.public)).timestamp;
                      if (response.status === 200) {
                        const db = await createTakosDB();
                        //db is npm package idb module IDBPDatabase<TakosDB>
                        const encryptedMasterKey = await encryptDataDeviceKey(
                          JSON.stringify(masterKey),
                          deviceKeyS,
                        );
                        const encryptedIdentityKey = await encryptDataDeviceKey(
                          JSON.stringify((await identityKey).identityKey),
                          deviceKeyS,
                        );
                        const encryptedAccountKey = await encryptDataDeviceKey(
                          JSON.stringify((await identityKey).accountKey),
                          deviceKeyS,
                        );
                        const encryptedKeyShareKey = await encryptDataDeviceKey(
                          JSON.stringify(keyShareKey),
                          deviceKeyS,
                        );
                        const encryptedKeyShareSignKey =
                          await encryptDataDeviceKey(
                            JSON.stringify(keyShareSignKey),
                            deviceKeyS,
                          );
                        localStorageEditor.set("sessionuuid", sessionUUID);
                        localStorageEditor.set("masterKey", encryptedMasterKey);
                        await db.put("identityAndAccountKeys", {
                          encryptedIdentityKey: encryptedIdentityKey,
                          encryptedAccountKey: encryptedAccountKey,
                          hashHex: idenKeyHash,
                          sended: false,
                          key: idenKeyHash,
                          timestamp: idenTimestamp,
                        });
                        await db.put("keyShareKeys", {
                          keyShareKey: encryptedKeyShareKey,
                          keyShareSignKey: encryptedKeyShareSignKey,
                          timestamp: keyShareTimestamp,
                          key: keyShareKeyHash,
                          keyHash: keyShareKeyHash,
                        });
                      }
                    };
                    reader.readAsArrayBuffer(file!);
                  }
                }}
              >
                <div>
                  <label class="block text-white mb-1">ニックネーム</label>
                  <input
                    type="text"
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                    placeholder="ニックネームを入力してください"
                    value={nickname()}
                    onInput={(e) => setNickname(e.currentTarget.value)}
                  />
                </div>
                <div>
                  <label class="block text-white mb-1">誕生日</label>
                  <input
                    type="date"
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                    value={birthday()}
                    onInput={(e) => setBirthday(e.currentTarget.value)}
                  />
                </div>
                <div>
                  <label class="block text-white mb-1">アイコン</label>
                  <input
                    type="file"
                    class="block w-full text-white"
                    onChange={(e) => {
                      const files = e.currentTarget.files;
                      if (files && files.length > 0) {
                        setIcon(files[0]);
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  class="w-full mt-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  送信
                </button>
              </form>
            </div>
          </div>
        </PopUpFrame>
      )}
    </>
  );
}