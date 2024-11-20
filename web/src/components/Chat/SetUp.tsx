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
import { uuidv7 } from "uuidv7";
import { requester } from "../../utils/requester";
import { createTakosDB, localStorageEditor } from "../../utils/idb";
import {
  encryptDataDeviceKey,
  generateAccountKey,
  generateIdentityKey,
  generateMasterKey,
  generateShareKey,
  keyHash,
} from "@takos/takos-encrypt-ink";

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
                      const arrayBuffer = reader.result as ArrayBuffer;
                      const base64 = arrayBufferToBase64(arrayBuffer);
                      const masterKey = generateMasterKey();
                      const sessionUUID = uuidv7();
                      const identityKey = await generateIdentityKey(
                        sessionUUID,
                        {
                          privateKey: masterKey.privateKey,
                          publicKey: masterKey.publicKey,
                        }
                      );
                      if (!identityKey) {
                        throw new Error("identityKey is not generated");
                      }
                      const accountKey = await generateAccountKey(
                        {
                          privateKey: masterKey.privateKey,
                          publicKey: masterKey.publicKey,
                        },
                      );
                      const sharekey = await generateShareKey(
                        masterKey.privateKey,
                        sessionUUID,
                      );
                      if (!accountKey || !sharekey) {
                        throw new Error(
                          "accountKey or sharekey is not generated",
                        );
                      }
                      const response = await requester(serverDomain, "setUp", {
                        sessionid: sessionidS,
                        masterKey: masterKey.publicKey,
                        identityKey: identityKey.publickKey,
                        accountKey: accountKey.publickKey,
                        identityKeySign: identityKey.sign,
                        accountKeySign: accountKey.sign,
                        nickName: nickname(),
                        icon: base64,
                        birthday: birthday(),
                        sessionUUID: sessionUUID,
                        shareKey: sharekey.publickKey,
                        shareKeySign: sharekey.sign,
                      });
                      if (response.status === 200) {
                        const encryptedMasterKey = await encryptDataDeviceKey(
                          deviceKeyS,
                          JSON.stringify(masterKey),
                        );
                        const encryptedIdentityKey = await encryptDataDeviceKey(
                          deviceKeyS,
                          identityKey.privateKey,
                        );
                        const encryptedAccountKey = await encryptDataDeviceKey(
                          deviceKeyS,
                          accountKey.privateKey,
                        );
                        const encryptedShareKey = await encryptDataDeviceKey(
                          deviceKeyS,
                          sharekey.privateKey,
                        );
                        if (
                          !encryptedMasterKey || !encryptedIdentityKey ||
                          !encryptedAccountKey || !encryptedShareKey
                        ) throw new Error("encrypted key is not generated");
                        localStorageEditor.set("masterKey", encryptedMasterKey);
                        localStorageEditor.set("sessionuuid", sessionUUID);
                        const db = await createTakosDB();
                        await db.put("identityKeys", {
                          key: await keyHash(identityKey.publickKey),
                          encryptedKey: encryptedIdentityKey,
                          timestamp:
                            JSON.parse(identityKey.publickKey).timestamp,
                        });
                        await db.put("accountKeys", {
                          key: await keyHash(accountKey.publickKey),
                          encryptedKey: encryptedAccountKey,
                          timestamp:
                            JSON.parse(accountKey.publickKey).timestamp,
                        });
                        await db.put("shareKeys", {
                          key: await keyHash(sharekey.publickKey),
                          encryptedKey: encryptedShareKey,
                          timestamp: JSON.parse(sharekey.publickKey).timestamp,
                        });
                        setSetted(true);
                        setIsOpen(false);
                        alert("セットアップが完了しました");
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
