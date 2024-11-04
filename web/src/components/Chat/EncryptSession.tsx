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
import {
  decryptDataDeviceKey,
  EncryptDataMigrateKey,
  generateMigrateKey,
  generateMigrateSignKey,
  signDataMigrateSignKey,
} from "@takos/takos-encrypt-ink";
import { requester } from "../../utils/requester";
import fnv1a from "fnv1a";
import { createTakosDB, localStorageEditor } from "../../utils/idb";

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
  const [sessionid] = useAtom(sessionidState);
  const [deviceKey] = useAtom(deviceKeyState);
  createEffect(() => {
    if (!EncryptedSession() && !setted() && setUp()) {
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
                          setMigrateKeyPublic(migrateKey.public);
                          setMigrateKeyPrivate(migrateKey.private);
                          const server = domain();
                          if (!server) return;
                          const response = await requester(
                            server,
                            "requestMigrate",
                            {
                              migrateKey: migrateKey.public,
                              sessionid: sessionid(),
                            },
                          );
                          const migrateData = await response.json();
                          console.log(migrateData);
                          setPage(2);
                        }}
                      >
                        既存のセッションから鍵をリクエスト
                      </button>
                    </div>
                    <div>
                      <button class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
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
                        onClick={async () => {
                          console.log(migrateSession());
                          if (!migrateSession()) return;
                          const migrateSignKey = generateMigrateSignKey();
                          setMigrateSignKeyPublic(migrateSignKey.public);
                          setMigrateSignKeyPrivate(migrateSignKey.private);
                          const server = domain();
                          if (!server) return;
                          const response = await requester(
                            server,
                            "acceptMigrate",
                            {
                              migrateSignKey: migrateSignKey.public,
                              migrateid: migrateSession(),
                              sessionid: sessionid(),
                            },
                          );
                          const resJson = await response.json();
                          setMigrateKeyPublic(resJson.migrateKey);
                          setPage(2);
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
                          const inputHash = Number(e.currentTarget.hash.value);
                          const hash = fnv1a(
                            migrateKeyPublic() + migrateSignKeyPublic(),
                          );
                          console.log(hash);
                          if (inputHash !== hash) {
                            alert("ハッシュが一致しません");
                            return;
                          }
                          const masterKey = localStorageEditor.get("masterKey");
                          const db = await createTakosDB();
                          const IdentityKeyAndAccountKey = await db.getAll(
                            "identityAndAccountKeys",
                          );
                          const allowkeys = await db.getAll("allowKeys");
                          if (
                            !masterKey || !IdentityKeyAndAccountKey ||
                            !allowkeys
                          ) return;
                          const deviceKeyValue = deviceKey();
                          if (!deviceKeyValue) return;
                          const decryptedMasterKey = await decryptDataDeviceKey(
                            masterKey,
                            deviceKeyValue,
                          );
                          const decryptedIdentityKeyAndAccountKey = [];
                          for (const key of IdentityKeyAndAccountKey) {
                            const decryptedIdentityKey =
                              await decryptDataDeviceKey(
                                key.encryptedIdentityKey,
                                deviceKeyValue,
                              );
                            const decryptedAccountKey =
                              await decryptDataDeviceKey(
                                key.encryptedAccountKey,
                                deviceKeyValue,
                              );
                            decryptedIdentityKeyAndAccountKey.push({
                              hashHex: key.hashHex,
                              sended: key.sended,
                              key: key.key,
                              timestamp: key.timestamp,
                              identityKey: decryptedIdentityKey,
                              accountKey: decryptedAccountKey,
                            });
                          }
                          const data = {
                            masterKey: decryptedMasterKey,
                            IdentityKeyAndAccountKey:
                              decryptedIdentityKeyAndAccountKey,
                            allowkeys,
                          };
                          const encryptData = await EncryptDataMigrateKey(
                            JSON.stringify(data),
                            migrateKeyPublic(),
                          );
                          const sign = await signDataMigrateSignKey(
                            encryptData,
                            {
                              public: migrateSignKeyPublic(),
                              private: migrateSignKeyPrivate(),
                            },
                          );
                          console.log(encryptData);
                          console.log(sign);
                          const server = domain();
                          if (!server) return;
                          await requester(server, "sendMigrateData", {
                            migrateid: migrateSession(),
                            migrateData: encryptData,
                            sign,
                            sessionid: sessionid(),
                          });
                          alert("鍵を送信しました");
                          setShowMigrate(false);
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
