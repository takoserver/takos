import { useAtom, useSetAtom } from "solid-jotai";
import {
  deviceKeyState,
  domainState,
  IdentityKeyAndAccountKeyState,
  MasterKeyState,
  notificationState,
  pageState,
  talkListState,
} from "../../utils/state";
import {
  isSelectRoomState,
  roomKeyState,
  selectedRoomState,
} from "../../utils/roomState";
import { Home } from "./home";
import {
  clearDB,
  createTakosDB,
  isValidLatestAccountKey,
  localStorageEditor,
} from "../../utils/idb";
import { requester } from "../../utils/requester";
import { PopUpFrame, PopUpInput, PopUpLabel, PopUpTitle } from "../popUpFrame";
import { createEffect, createSignal } from "solid-js";
import { splitUserName } from "../../../../takos-web/util/takosClient";
import {
  decryptDataAccountKey,
  decryptDataDeviceKey,
  encryptDataDeviceKey,
  encryptDataShareKey,
  encryptRoomKeyWithAccountKeys,
  generateAccountKey,
  generateIdentityKey,
  generateMasterKey,
  generateMigrateKey,
  generateRoomkey,
  generateShareKey,
  isValidEncryptedAccountKey,
  isValidkeyPairEncrypt,
  isValidkeyPairSign,
  keyHash,
  signMasterKey,
  verifyIdentityKey,
} from "@takos/takos-encrypt-ink";
import { uuidv7 } from "uuidv7";
export function SideBer() {
  const [page] = useAtom(pageState);

  return (
    <>
      {page() === "home" && <Home />}
      {page() === "setting" && <Setting />}
      {page() === "friend" && <Friend />}
      {page() === "notification" && <Notification />}
      {page() === "talk" && <TalkList />}
    </>
  );
}

function TalkListFriend({
  latestMessage,
  roomid
}:{
  timestamp: string;
  latestMessage: string;
  type: "group" | "friend";
  roomid: string;
}) {
  const [nickName, setNickName] = createSignal("");
  const [icon, setIcon] = createSignal("");
  createEffect(async () => {
    const friendInfo = await fetch(`https://${roomid.split("@")[1]}/_takos/v2/friend/info?userName=` + roomid.split("@")[0])
    const resJson = await friendInfo.json();
    setNickName(resJson.nickName);
    setIcon(resJson.icon);
  });
  return (
    <div
    class="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[#282828]"
    onClick={async () => {
      
    }}
  >
    <img
      src={"data:image/png;base64," + icon()}
      alt="icon"
      class="w-12 h-12 rounded-full object-cover"
    />
    <div>
      <div class="font-semibold text-lg">
        {nickName()}
      </div>
      <div class="text-xs text-gray-400">{roomid}</div>
      <div class="text-sm text-gray-500">{latestMessage}</div>
    </div>
  </div>
  )
}

function TalkList() {
  const [talkList] = useAtom(talkListState);
  const [domain] = useAtom(domainState);
  const [nickNames, setNickNames] = createSignal<{ [key: string]: string }>({});
  const [icons, setIcons] = createSignal<{ [key: string]: string }>({});
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [isSelectRoom, setIsSelectRoom] = useAtom(isSelectRoomState);
  const [identityKeyAndAccountKey] = useAtom(IdentityKeyAndAccountKeyState);
  const [masterKey] = useAtom(MasterKeyState);
  const [deviceKey] = useAtom(deviceKeyState);
  const setRoomKeyState = useSetAtom(roomKeyState);
  const handelSelectRoomFriend = async (talk: any) => {
  };

  return (
    <>
      {talkList()?.map((talk) => {
        if (talk.type === "friend") {
          console.log(talk);
          return (
            <TalkListFriend
              timestamp={talk.timestamp}
              latestMessage={talk.latestMessage}
              type={talk.type}
              roomid={talk.roomid}
            />
          );
        }
      })}
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
            <PopUpInput
              type="text"
              placeholder="id"
              state={setAddFriendByIdFormInput}
            />
            <button
              class="w-full mt-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={async () => {
                const res = await fetch("/api/v2/friend/request", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    userName: addFriendByIdFormInput(),
                  }),
                })
                if(res.status !== 200) {
                  console.log("error")
                  return;
                }
                alert("リクエストを送信しました");
              }}
            >
              追加
            </button>
          </div>
        </PopUpFrame>
      )}
    </>
  );
}

function Notification() {
  const [notification] = useAtom(notificationState);
  const [domain] = useAtom(domainState);
  return (
    <>
      {notification().map((n) => {
        if(n.type === "friend") {
          return (
            <div class="bg-[#282828] text-white p-4 rounded-lg mb-3 shadow-lg transition-transform transform border-[2px] border-white/10">
            <div class="mb-2">
              <div class="font-semibold text-lg mb-1">友達</div>
              <div class="text-sm text-gray-300">{n.sender}</div>
            </div>
            <div class="mt-2 flex justify-end space-x-3">
              <button
                class="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-full shadow-sm transition-all text-[14px]"
                onClick={async () => {
                  const res = await fetch("/api/v2/friend/accept", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      id: n.id,
                    }),
                  })
                  console.log(res.json())
                }}
              >
                許可
              </button>
              <button
                class="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded-full shadow-sm transition-all text-[14px]"
                onClick={() => {
                  // Handle reject action
                  console.log(`Rejected notification from ${n.sender}`);
                }}
              >
                拒否
              </button>
            </div>
          </div>
          )
        }
      })}
    </>
  );
}

function Setting() {
  const [domain] = useAtom(domainState);
  const [masterKey] = useAtom(MasterKeyState);
  const [deviceKey] = useAtom(deviceKeyState);
  const [sahredata, setShareData] = createSignal("");
  const [shareDataSign, setShareDataSign] = createSignal("");
  const [chooseAccountKeyShareSession, setChooseAccountKeyShareSession] =
    createSignal(false);
  const [
    chooseAccountKeyShareSessionUUID,
    setChooseAccountKeyShareSessionUUID,
  ] = createSignal<[
    string, // sessionuuid
    number, //timestamp
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
          await clearDB();
        }}
      >
        ログアウト
      </button>
      <div>
        魔法のボタンたち
      </div>
      <div>
        <button
          onClick={async () => {
            const keyShareKeys = await requester(
              domain() as string,
              "getShareKeys",
              {
                sessionid: localStorage.getItem("sessionid"),
              },
            ).then((res) => res.json());
            if (!keyShareKeys) return;
            const sahreUUID: [
              string, // sessionuuid
              number, //timestamp
              boolean,
              {
                keySharekey: string;
                keyShareKeySign: string;
              },
            ][] = [];
            for (const key of keyShareKeys.keyShareKeys) {
              sahreUUID.push([
                key.session,
                JSON.parse(key.shareKey).timestamp,
                true,
                {
                  keySharekey: key.shareKey,
                  keyShareKeySign: key.sign,
                },
              ]);
            }
            setChooseAccountKeyShareSessionUUID(sahreUUID);
            setChooseAccountKeyShareSession(true);
          }}
        >
          AccountKey更新ボタン
        </button>
      </div>
      <div>
        <button
          onClick={async () => {
          }}
        >
          identityKey更新ボタン
        </button>
      </div>
      <div>
        <button
          onClick={async () => {
            const uuid = uuidv7();
            const masterKey = generateMasterKey();
            const accountKey = await generateAccountKey({
              privateKey: masterKey.privateKey,
              publicKey: masterKey.publicKey,
            });
            const shareKey = await generateShareKey(
              masterKey.privateKey,
              uuidv7(),
            );
            const identityKey = await generateIdentityKey(
              uuid,
              {
                privateKey: masterKey.privateKey,
                publicKey: masterKey.publicKey,
              },
            );
            const migrateKey = await generateMigrateKey();
            if (
              !masterKey || !accountKey || !shareKey || !identityKey ||
              !migrateKey
            ) {
              console.log("error");
              return;
            }
            console.log(isValidkeyPairSign({
              public: masterKey.publicKey,
              private: masterKey.privateKey,
            }));
            console.log(isValidkeyPairSign({
              public: identityKey.publickKey,
              private: identityKey.privateKey,
            }));
            console.log(isValidkeyPairEncrypt({
              public: accountKey.publickKey,
              private: accountKey.privateKey,
            }));
            console.log(isValidkeyPairEncrypt({
              public: shareKey.publickKey,
              private: shareKey.privateKey,
            }));
            console.log(isValidkeyPairEncrypt({
              public: migrateKey.publickKey,
              private: migrateKey.privateKey,
            }));
            const encryptedAccountKey = await encryptDataShareKey(
              shareKey.publickKey,
              accountKey.privateKey,
            );
            if (!encryptedAccountKey) {
              console.log("error");
              return;
            }
            console.log(encryptedAccountKey.length);
            console.log(isValidEncryptedAccountKey(encryptedAccountKey));
          }}
        >
          masterKey更新ボタン
        </button>
      </div>
      {chooseAccountKeyShareSession() && (
        <PopUpFrame
          closeScript={setChooseAccountKeyShareSession}
        >
          <div>
            <PopUpTitle>共有するセッションを選択</PopUpTitle>
            {chooseAccountKeyShareSessionUUID().map((session) => (
              <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={session[2]}
                  class="w-4 h-4 accent-blue-600 cursor-pointer"
                  onClick={() => {
                    setChooseAccountKeyShareSessionUUID(
                      chooseAccountKeyShareSessionUUID().map((s) => {
                        if (s[0] === session[0]) {
                          return [s[0], s[1], !s[2], s[3]];
                        }
                        return s;
                      }),
                    );
                  }}
                />
                <div class="flex flex-col">
                  <PopUpLabel htmlFor="text">
                    {session[0]}
                  </PopUpLabel>
                  <span class="text-gray-400 text-sm">
                    {new Date(session[1]).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            class="w-full mt-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={async () => {
              const uuid = localStorage.getItem("sessionuuid");
              //@ts-ignore
              const masterKeyValue = masterKey();
              if (!uuid) return;
              if (!masterKey) return;
              console.log(masterKeyValue);
              //@ts-ignore
              if (!masterKeyValue) return;
              const acccountKey = await generateAccountKey(
                {
                  //@ts-ignore
                  privateKey: masterKeyValue.privateKey,
                  //@ts-ignore
                  publicKey: masterKeyValue.publicKey,
                },
              );
              if (!acccountKey) return;
              const encryptedAccountKeyDeviceKey = await encryptDataDeviceKey(
                deviceKey()!,
                acccountKey.privateKey,
              );
              const encryptedAccountKeys: [string, string][] = [];
              for (const session of chooseAccountKeyShareSessionUUID()) {
                if (session[2]) {
                  const encryptedAccountKey = await encryptDataShareKey(
                    session[3].keySharekey,
                    acccountKey.privateKey,
                  );
                  if (!encryptedAccountKey) {
                    console.error("Failed to encrypt account key");
                    return;
                  }
                  console.log(encryptedAccountKey.length);
                  encryptedAccountKeys.push([session[0], encryptedAccountKey]);
                }
              }
              //@ts-ignore
              const privateSign = await signMasterKey(
                //@ts-ignore
                masterKeyValue!.privateKey,
                acccountKey.privateKey,
              );
              const response = await requester(
                domain() as string,
                "updateAccountKey",
                {
                  sessionid: localStorageEditor.get("sessionid"),
                  sharedData: encryptedAccountKeys,
                  accountKeyPublic: acccountKey.publickKey,
                  accSign: acccountKey.sign,
                },
              );
              if (response.status !== 200) {
                console.error("Failed to update account key");
                return;
              }
              const db = await createTakosDB();
              await db.put("accountKeys", {
                key: await keyHash(acccountKey.publickKey),
                encryptedKey: encryptedAccountKeyDeviceKey!,
                timestamp: JSON.parse(acccountKey.publickKey).timestamp,
              });
              alert("アカウントキーの更新が完了しました");
            }}
          >
            更新
          </button>
        </PopUpFrame>
      )}
    </>
  );
}
