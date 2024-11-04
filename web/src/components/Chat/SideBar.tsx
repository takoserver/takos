import { useAtom } from "solid-jotai";
import {
  deviceKeyState,
  domainState,
  MasterKeyState,
  pageState,
} from "../../utils/state";
import { Home } from "./home";
import { createTakosDB } from "../../utils/idb";
import { requester } from "../../utils/requester";
import {
  decryptDataDeviceKey,
  generateIdentityKeyAndAccountKey,
  signDataKeyShareKey,
  signDataMasterKey,
  verifyDataKeyShareKey,
  verifyDataMasterKey,
  EncryptDataKeyShareKey,
} from "@takos/takos-encrypt-ink";
import { PopUpFrame, PopUpInput, PopUpLabel, PopUpTitle } from "../popUpFrame";
import { createSignal } from "solid-js";
export function SideBer() {
  const [page] = useAtom(pageState);

  return (
    <>
      {page() === "home" && <Home />}
      {page() === "setting" && <Setting />}
    </>
  );
}

function Setting() {
  const [domain] = useAtom(domainState);
  const [masterKey] = useAtom(MasterKeyState);
  const [deviceKey] = useAtom(deviceKeyState);
  const [sahredata, setShareData] = createSignal("");
  const [shareDataSign, setShareDataSign] = createSignal("");
  const [chooseShareSession, setChooseShareSession] = createSignal(false);
  const [chooseShareSessionUUID, setChooseShareSessionUUID] = createSignal<[
    string, // sessionuuid
    boolean,
    {
      keySharekey: string;
      keyShareKeySign: string;
    },
  ][]>([]);
  return (
    <>
      <button
        onClick={async () => {
          localStorage.clear();
          const db = await createTakosDB();
          await db.clear("allowKeys");
          await db.clear("identityAndAccountKeys");
          await db.clear("keyShareKeys");
        }}
      >
        ログアウト
      </button>

      <div>
        <button
          onClick={async () => {
            const server = domain();
            if (!server) return;
            const masterKeyValue = masterKey();
            if (!masterKeyValue) {
              console.log("Invalid MasterKey");
              return;
            }
            const newIdentityKeyAndAccountKey =
              await generateIdentityKeyAndAccountKey({
                public: masterKeyValue.public,
                private: masterKeyValue.private,
              });
            const shareData = JSON.stringify(newIdentityKeyAndAccountKey);

            const keyShareKeyRes = await requester(
              server,
              "getKeyShareKeys",
              {
                sessionid: localStorage.getItem("sessionid"),
              },
            ).then((res) => res.json())
              .then((res) => res.keySharekeys);
            const now = new Date();

            const keyShareSignKey = await (async () => {
              const db = await createTakosDB();
              const keyShareSignKey = await db.getAll("keyShareKeys");
              // 新しい順に並び替え
              keyShareSignKey.sort((a, b) => {
                return new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime();
              });
              const latestKeyShareKey = keyShareSignKey[0];
              const deviceKeyValue = deviceKey();
              if (!deviceKeyValue) {
                console.log("Invalid DeviceKey");
                return;
              }
              const decryptedKeyShareSignKey = await decryptDataDeviceKey(
                latestKeyShareKey.keyShareSignKey,
                deviceKeyValue,
              );
              return JSON.parse(decryptedKeyShareSignKey);
            })();
            console.log(keyShareSignKey);
            const shareDataSign = await signDataKeyShareKey(shareData, {
              public: keyShareSignKey.public,
              private: keyShareSignKey.private,
            });
            setShareData(shareData);
            setShareDataSign(shareDataSign);
            setChooseShareSessionUUID(
              keyShareKeyRes.map((keyShareKey: {
                keyShareKey: string;
                sign: string;
                sessionUUID: string;
              }) => {
                return [
                  keyShareKey.sessionUUID,
                  true,
                  {
                    keySharekey: keyShareKey.keyShareKey,
                    keyShareKeySign: keyShareKey.sign,
                  },
                ];
              }),
            );
            setChooseShareSession(true);
          }}
        >
          鍵更新ボタン
        </button>
      </div>
      {chooseShareSession() && (
        <PopUpFrame
          closeScript={setChooseShareSession}
        >
          <div>
            <PopUpTitle>共有するセッションを選択</PopUpTitle>
            {chooseShareSessionUUID().map((session) => (
              <div class="flex items-center gap-3 p-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={session[1]}
                  class="w-4 h-4 accent-blue-600 cursor-pointer"
                  onClick={() => {
                    setChooseShareSessionUUID(
                      chooseShareSessionUUID().map((s) => {
                        if (s[0] === session[0]) {
                          return [s[0], !s[1], s[2]];
                        }
                        return s;
                      }),
                    );
                  }}
                />
                <PopUpLabel htmlFor="text">
                  {session[0]}
                </PopUpLabel>
              </div>
            ))}
          </div>
          <button
            class="w-full mt-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={async () => {
              const server = domain();
              if (!server) return;
              const masterKeyValue = masterKey();
              if (!masterKeyValue) {
                console.log("Invalid MasterKey");
                return;
              }
              const encryptedIdentityKeyAndAccountKey = await Promise.all(
                chooseShareSessionUUID().map(async (session) => {
                  if (session[1]) {
                    const keyShareKey = session[2].keySharekey;
                    const keyShareKeySign = session[2].keyShareKeySign;
                    if (
                      !verifyDataMasterKey(
                        keyShareKey,
                        masterKeyValue.public,
                        keyShareKeySign,
                      )
                    ) {
                      console.log("Invalid KeyShareKey");
                      return;
                    }
                    const encryptedShareData = await EncryptDataKeyShareKey(
                      sahredata(),
                      keyShareKey,
                    )
                  }
                })
              );
              console.log(encryptedIdentityKeyAndAccountKey);
            }}
          >
            更新
          </button>
        </PopUpFrame>
      )}
    </>
  );
}
