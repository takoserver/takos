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
  encryptDataDeviceKey,
  EncryptDataKeyShareKey,
  generateIdentityKeyAndAccountKey,
  isValidkeyShareSignKeyPrivate,
  isValidkeyShareSignKeyPublic,
  keyHash,
  signDataKeyShareKey,
  signDataMasterKey,
  verifyDataKeyShareKey,
  verifyDataMasterKey,
} from "@takos/takos-encrypt-ink";
import { PopUpFrame, PopUpInput, PopUpLabel, PopUpTitle } from "../popUpFrame";
import { createSignal } from "solid-js";
import { checkUserName } from "../../../../takos/utils/checks";
export function SideBer() {
  const [page] = useAtom(pageState);

  return (
    <>
      {page() === "home" && <Home />}
      {page() === "setting" && <Setting />}
      {page() === "friend" && <Friend />}
      {page() === "notification" && <Notification />}
    </>
  );
}


function Friend() {
  const [addFriendByIdFormOpen, setAddFriendByIdFormOpen] = createSignal(false);
  const [addFriendByIdFormInput, setAddFriendByIdFormInput] = createSignal("");
  const [domain] = useAtom(domainState);
  return (
    <>
    <button
    onClick={() => {
      setAddFriendByIdFormOpen(true);
    }}
    >
      友達をidで追加
    </button>
    {addFriendByIdFormOpen() && (
      <PopUpFrame closeScript={setAddFriendByIdFormOpen}>
        <div>
          <PopUpTitle>友達をidで追加</PopUpTitle>
          <PopUpInput type="text" placeholder="id" state={setAddFriendByIdFormInput} />
          <button
          class="w-full mt-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={async () => {
            const server = domain();
            if (!server) return;
            console.log()
            const res = await requester(server, "requestFriend", {
              sessionid: localStorage.getItem("sessionid"),
              userName: addFriendByIdFormInput(),
            });
          }}
          >追加</button>
        </div>
      </PopUpFrame>
    )}
    </>
  );
}

function Notification() {
  return (
    <div>
      <h1>Notification</h1>
    </div>
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
  const [rawIdentityKeyAndAccountKey, setRawIdentityKeyAndAccountKey] =
    createSignal<{
      identityKey: {
        public: string;
        private: string;
        sign: string;
      };
      accountKey: {
        public: string;
        private: string;
        sign: string;
      };
    }>();
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
            console.log(JSON.parse(keyShareSignKey.public));
            console.log(isValidkeyShareSignKeyPublic(keyShareSignKey.public));
            console.log(isValidkeyShareSignKeyPrivate(keyShareSignKey.private));
            const shareDataSign = await signDataKeyShareKey(shareData, {
              public: keyShareSignKey.public,
              private: keyShareSignKey.private,
            });
            setShareData(shareData);
            setShareDataSign(shareDataSign);
            setRawIdentityKeyAndAccountKey(newIdentityKeyAndAccountKey);
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
                    );
                    return [session[0], encryptedShareData];
                  }
                }),
              );

              encryptedIdentityKeyAndAccountKey.filter((data) => {
                if (data) {
                  return data;
                }
              });
              const db = await createTakosDB();
              const deviceKeyValue = deviceKey();
              if (!deviceKeyValue) {
                console.log("Invalid DeviceKey");
                return;
              }
              const identityAndAccount = rawIdentityKeyAndAccountKey();
              if (!identityAndAccount) return;
              const encryptedAccountKey = await encryptDataDeviceKey(
                JSON.stringify(identityAndAccount.accountKey),
                deviceKeyValue,
              );
              const encryptedIdentityKey = await encryptDataDeviceKey(
                JSON.stringify(identityAndAccount.identityKey),
                deviceKeyValue,
              );
              const requestData = {
                sessionid: localStorage.getItem("sessionid"),
                sharedData: encryptedIdentityKeyAndAccountKey.filter((data) =>
                  data !== undefined
                ),
                sign: shareDataSign(),
                identityKeyPublic: identityAndAccount.identityKey.public,
                accountKeyPublic: identityAndAccount.accountKey.public,
              };
              const response = await requester(
                server,
                "updateIdentityKeyAndAccountKey",
                requestData,
              );
              if (response.status === 200) {
                await db.put("identityAndAccountKeys", {
                  encryptedIdentityKey: encryptedIdentityKey,
                  encryptedAccountKey: encryptedAccountKey,
                  hashHex: await keyHash(identityAndAccount.identityKey.public),
                  sended: true,
                  key: await keyHash(identityAndAccount.identityKey.public),
                  timestamp:
                    JSON.parse(identityAndAccount.identityKey.public).timestamp,
                });
                alert("成功しました");
                window.location.reload();
                return;
              }
              alert("失敗しました");
              //sendedをfalseにする
              await db.put("identityAndAccountKeys", {
                encryptedIdentityKey: encryptedIdentityKey,
                encryptedAccountKey: encryptedAccountKey,
                hashHex: await keyHash(identityAndAccount.identityKey.public),
                sended: false,
                key: await keyHash(identityAndAccount.identityKey.public),
                timestamp:
                  JSON.parse(identityAndAccount.identityKey.public).timestamp,
              });
            }}
          >
            更新
          </button>
        </PopUpFrame>
      )}
    </>
  );
}
