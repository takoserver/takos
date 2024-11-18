import {
  deviceKeyState,
  domainState,
  EncryptedSessionState,
  IdentityKeyAndAccountKeyState,
  sessionidState,
  setUpState,
} from "../../utils/state";
import {
  migrateKeyPrivateState,
  migrateKeyPublicState,
  migrateRequestPage,
  migrateSessionid,
  migrateSignKeyPrivateState,
  migrateSignKeyPublicState,
  showMigrateRequest,
} from "../../utils/migrateState";
import { atom, useAtom, useSetAtom } from "solid-jotai";
import { PopUpFrame } from "./setupPopup/popUpFrame";
import { createEffect, createSignal } from "solid-js";
import { requester } from "../../utils/requester";
import fnv1a from "fnv1a";
import { createTakosDB, localStorageEditor } from "../../utils/idb";
import {
  decryptDataDeviceKey,
  encryptDataDeviceKey,
  encryptDataMigrateKey,
  generateAccountKey,
  generateIdentityKey,
  generateMasterKey,
  generateMigrateKey,
  generateMigrateSignKey,
  generateShareKey,
  keyHash,
  signDataMigrateSignKey,
} from "@takos/takos-encrypt-ink";
import { uuidv7 } from "uuidv7";

export function EncryptSession() {
  const [EncryptedSession, setEncryptedSession] = useAtom(
    EncryptedSessionState,
  );
  const [setUp, setSetUp] = useAtom(setUpState);
  const [isOpen, setIsOpen] = createSignal(false);
  const [setted, setSetted] = createSignal(false);
  const [page, setPage] = useAtom(migrateRequestPage);
  const [domain] = useAtom(domainState);
  const [migrateKeyPublic, setMigrateKeyPublic] = useAtom(
    migrateKeyPublicState,
  );
  const [migrateKeyPrivate, setMigrateKeyPrivate] = useAtom(
    migrateKeyPrivateState,
  );
  const [migrateSignKeyPublic, setMigrateSignKeyPublic] = useAtom(
    migrateSignKeyPublicState,
  );
  const [migrateSignKeyPrivate, setMigrateSignKeyPrivate] = useAtom(
    migrateSignKeyPrivateState,
  );
  const [migrateSession, setMigrateSession] = useAtom(migrateSessionid);
  const [sessionid] = useAtom(sessionidState);
  const [deviceKey] = useAtom(deviceKeyState);
  createEffect(() => {
    if (!EncryptedSession() && !setted()) {
      setIsOpen(true);
    }
  });
  return (
    <>
      {isOpen() && (
        <PopUpFrame closeScript={setIsOpen}>
          <div class="h-full w-full flex items-center justify-center">
            <div class="max-w-md w-full px-6">
              <h1 class="text-2xl font-semibold text-center mb-6">
                セッションの暗号化
              </h1>
              <div>
                {page() === 1 && (
                  <>
                    <div class="mb-4">
                      <button
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                        onClick={async () => {
                          const migrateKey = generateMigrateKey();
                          setMigrateKeyPrivate(migrateKey.privateKey);
                          setMigrateKeyPublic(migrateKey.publickKey);
                          const response = await requester(
                            domain() as string,
                            "requestMigrate",
                            {
                              sessionid: sessionid(),
                              migrateKey: migrateKey.publickKey,
                            },
                          );
                          if (response.status === 200) {
                            setPage(2);
                            const json = await response.json();
                            setMigrateSession(json.migrateid);
                          }
                        }}
                      >
                        既存のセッションから鍵をリクエスト
                      </button>
                    </div>
                    <div>
                      <button
                        class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                        onClick={async () => {
                          const masterKey = generateMasterKey();
                          const uuid = uuidv7();
                          const identityKey = await generateIdentityKey(
                            uuid,
                            masterKey.privateKey,
                          );
                          if (!identityKey) {
                            throw new Error("identityKey is not generated");
                          }
                          const accountKey = await generateAccountKey(
                            masterKey.privateKey,
                          );
                          if (!accountKey) {
                            throw new Error("accountKey is not generated");
                          }
                          const sharekey = await generateShareKey(
                            masterKey.privateKey,
                            uuid,
                          );
                          if (!accountKey || !sharekey) {
                            throw new Error(
                              "accountKey or sharekey is not generated",
                            );
                          }
                          const response = await requester(
                            localStorageEditor.get("server") as string,
                            "resetMasterKey",
                            {
                              masterKey: masterKey.publicKey,
                              identityKey: identityKey.publickKey,
                              accountKey: accountKey.publickKey,
                              identityKeySign: identityKey.sign,
                              accountKeySign: accountKey.sign,
                              sessionUUID: uuid,
                              shareKey: sharekey.publickKey,
                              shareKeySign: sharekey.sign,
                              sessionid: localStorageEditor.get("sessionid"),
                            },
                          );
                          const deviceKeyS = deviceKey();
                          if (!deviceKeyS) {
                            throw new Error("deviceKey is not generated");
                          }
                          if (response.status === 200) {
                            const encryptedMasterKey =
                              await encryptDataDeviceKey(
                                deviceKeyS,
                                JSON.stringify(masterKey),
                              );
                            const encryptedIdentityKey =
                              await encryptDataDeviceKey(
                                deviceKeyS,
                                identityKey.privateKey,
                              );
                            const encryptedAccountKey =
                              await encryptDataDeviceKey(
                                deviceKeyS,
                                accountKey.privateKey,
                              );
                            const encryptedShareKey =
                              await encryptDataDeviceKey(
                                deviceKeyS,
                                sharekey.privateKey,
                              );
                            if (
                              !encryptedMasterKey ||
                              !encryptedIdentityKey ||
                              !encryptedAccountKey ||
                              !encryptedShareKey
                            ) {
                              throw new Error("encrypted key is not generated");
                            }
                            localStorageEditor.set(
                              "masterKey",
                              encryptedMasterKey,
                            );
                            localStorageEditor.set("sessionuuid", uuid);
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
                            setEncryptedSession(true);
                          }
                        }}
                      >
                        新しい鍵を作成
                      </button>
                    </div>
                  </>
                )}
                {page() === 2 && (
                  <>
                    <div class="text-center">
                      認証済みのセッションから鍵をリクエストしました。
                      応答をお待ちください。
                    </div>
                  </>
                )}
                {page() === 3 && (
                  <>
                    <div>
                      {(() => {
                        const migratekey = migrateKeyPublic();
                        const migrateSignKey = migrateSignKeyPublic();
                        if (!migratekey || !migrateSignKey) return "";
                        return String(
                          "hash: " + fnv1a(migratekey + migrateSignKey),
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </PopUpFrame>
      )}
      <AcceptMigrateKey />
    </>
  );
}

export function AcceptMigrateKey() {
  const [showMigrate, setShowMigrate] = useAtom(showMigrateRequest);
  const pageState = atom(1);
  const [page, setPage] = useAtom(pageState);
  const [migrateSession] = useAtom(migrateSessionid);
  const [migrateSignKeyPublic, setMigrateSignKeyPublic] = useAtom(
    migrateSignKeyPublicState,
  );
  const [migrateKeyPublic, setMigrateKeyPublic] = useAtom(
    migrateKeyPublicState,
  );
  const [domain] = useAtom(domainState);
  const [sessionid] = useAtom(sessionidState);
  const [migrateSignKeyPrivate, setMigrateSignKeyPrivate] = useAtom(
    migrateSignKeyPrivateState,
  );
  const [deviceKey] = useAtom(deviceKeyState);
  return (
    <>
      {showMigrate() && (
        <PopUpFrame closeScript={setShowMigrate}>
          <div class="h-full w-full flex items-center justify-center">
            <div class="max-w-md w-full px-6">
              <h1 class="text-2xl font-semibold text-center mb-6">
                セッションの暗号化
              </h1>
              <div>
                {page() === 1 && (
                  <>
                    <div class="mb-4">
                      <button
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                        onClick={async (e) => {
                          e.preventDefault();
                          const migrateSignKey = generateMigrateSignKey();
                          setMigrateSignKeyPrivate(migrateSignKey.privateKey);
                          setMigrateSignKeyPublic(migrateSignKey.publickKey);
                          const response = await requester(
                            domain() as string,
                            "acceptMigrate",
                            {
                              sessionid: sessionid(),
                              migrateid: migrateSession(),
                              migrateSignKey: migrateSignKey.publickKey,
                            },
                          );
                          if (response.status === 200) {
                            setPage(2);
                            const json = await response.json();
                            setMigrateKeyPublic(json.migrateKey);
                          }
                        }}
                      >
                        鍵を受け入れる
                      </button>
                    </div>
                    <div>
                      <button
                        class="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                        onClick={() => setShowMigrate(false)}
                      >
                        鍵を拒否する
                      </button>
                    </div>
                  </>
                )}
                {page() === 2 && (
                  <>
                    <div class="mb-4">
                      {/* input hash form */}
                      <form
                        class="space-y-4"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const migrarteKey = migrateKeyPublic();
                          const migrateSignKey = migrateSignKeyPublic();
                          if (!migrarteKey || !migrateSignKey) return;
                          const hash = fnv1a(migrarteKey + migrateSignKey);
                          const hashInput = e.currentTarget.hash.value;
                          if (hash !== Number(hashInput)) {
                            alert("ハッシュが一致しません");
                            return;
                          }
                          const encryptedMasterKey = localStorageEditor.get(
                            "masterKey",
                          );
                          if (!encryptedMasterKey) return;
                          const masterKey = await decryptDataDeviceKey(
                            deviceKey() as string,
                            encryptedMasterKey,
                          );
                          const db = await createTakosDB();
                          const allAccountKey = await Promise.all(
                            (await db.getAll("accountKeys")).map( async (data) => {
                              const decrypted = await decryptDataDeviceKey(
                                deviceKey() as string,
                                data.encryptedKey,
                              );
                              if (!decrypted) return null;
                              return {
                                key: decrypted,
                                timestamp: data.timestamp,
                              }
                            })
                          )
                          allAccountKey.filter((key) => key !== null);
                          const migrateData = JSON.stringify({
                            masterKey,
                            accountKeys: allAccountKey,
                          });
                          const encryptedMigrateData =
                            await encryptDataMigrateKey(
                              migrateKeyPublic(),
                              migrateData,
                            );
                          if (!encryptedMigrateData) return;
                          const sign = await signDataMigrateSignKey(
                            migrateSignKeyPrivate(),
                            encryptedMigrateData,
                          );
                          if (!sign) return;
                          const response = await requester(
                            domain() as string,
                            "sendMigrateData",
                            {
                              sessionid: sessionid(),
                              migrateid: migrateSession(),
                              migrateData: encryptedMigrateData,
                              sign,
                            },
                          );
                        }}
                      >
                        <input
                          type="number"
                          name="hash"
                          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                          placeholder="ハッシュを入力"
                          required
                        />
                        <button
                          type="submit"
                          class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                          検証
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </PopUpFrame>
      )}
    </>
  );
}
