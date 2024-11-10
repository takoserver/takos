import { useAtom } from "solid-jotai";
import {
  deviceKeyState,
  domainState,
  IdentityKeyAndAccountKeyState,
  MasterKeyState,
  notificationState,
  pageState,
  talkListState,
} from "../../utils/state";
import { isSelectRoomState, selectedRoomState } from "../../utils/roomState";
import { Home } from "./home";
import { createTakosDB } from "../../utils/idb";
import { requester } from "../../utils/requester";
import {
  decryptDataDeviceKey,
  encryptDataDeviceKey,
  EncryptDataKeyShareKey,
  generateIdentityKeyAndAccountKey,
  generateRoomKey,
  isValidAccountPublicKey,
  isValidIdentityPublicKey,
  isValidkeyShareSignKeyPrivate,
  isValidkeyShareSignKeyPublic,
  isValidMasterKeyPub,
  keyHash,
  signDataKeyShareKey,
  signDataMasterKey,
  verifyDataIdentityKey,
  verifyDataKeyShareKey,
  verifyDataMasterKey,
} from "@takos/takos-encrypt-ink";
import { PopUpFrame, PopUpInput, PopUpLabel, PopUpTitle } from "../popUpFrame";
import { createEffect, createSignal } from "solid-js";
import { checkUserName } from "../../../../takos/utils/checks";
import { splitUserName } from "../../../../takos-web/util/takosClient";
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

function TalkList() {
  const [talkList] = useAtom(talkListState);
  const [domain] = useAtom(domainState);
  const [nickNames, setNickNames] = createSignal<{ [key: string]: string }>({});
  const [icons, setIcons] = createSignal<{ [key: string]: string }>({});
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [isSelectRoom, setIsSelectRoom] = useAtom(isSelectRoomState);
  const [identityKeyAndAccountKey] = useAtom(IdentityKeyAndAccountKeyState);
  const [masterKey] = useAtom(MasterKeyState);

  // 非同期でニックネームとアイコンを取得
  createEffect(async () => {
    const server = domain();
    if (!server || !talkList()) return;

    const names: { [key: string]: string } = {};
    const iconsData: { [key: string]: string } = {};

    for (const talk of talkList() || []) {
      if (talk.type === "friend") {
        try {
          // ニックネームを取得
          const resNickName = await requester(server, "getFriendNickName", {
            userName: talk.roomName,
            sessionid: localStorage.getItem("sessionid"),
          });
          const dataNickName = await resNickName.json();
          names[talk.roomName] = dataNickName.nickName;
        } catch (error) {
          console.error("Failed to fetch nickname:", error);
        }

        try {
          // アイコンを取得
          const resIcon = await requester(server, "getFriendIcon", {
            userName: talk.roomName,
            sessionid: localStorage.getItem("sessionid"),
          });
          const dataIcon = await resIcon.json();
          iconsData[talk.roomName] = dataIcon.icon;
        } catch (error) {
          console.error("Failed to fetch icon:", error);
        }
      }
    }

    setNickNames(names);
    setIcons(iconsData);
  });

  return (
    <>
      {talkList()?.map((talk) => {
        if (talk.type === "friend") {
          return (
            <div
              class="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[#282828]"
              onClick={async () => {
                setSelectedRoom({
                  type: "friend",
                  roomName: talk.roomName,
                });
                setIsSelectRoom(true);
                const server = domain();
                if (!server) return;
                const latestRoomKey = await requester(
                  server,
                  "getLatestMyRoomKey",
                  {
                    sessionid: localStorage.getItem("sessionid"),
                    roomid: talk.roomid,
                  },
                );
                if (latestRoomKey.status === 200) {
                  const data = await latestRoomKey.json();
                  if (data.status) {
                  } else {
                    const { domain: friendDomain, userName: friendUserName } =
                      splitUserName(talk.roomName);
                    const db = await createTakosDB();
                    const creditInfo = await db.getAll("allowKeys");
                    const friendMasterKey = await requester(
                      friendDomain,
                      "getMasterKey",
                      {
                        userName: friendUserName,
                      },
                    ).then((res) => res.json());
                    const friendIdentitykeyAndAccountKey = await requester(
                      friendDomain,
                      "getIdentityKeyAndAccountKeyLatest",
                      {
                        userName: friendUserName,
                      },
                    ).then((res) => res.json());
                    const myLatestIdentityKey =
                      identityKeyAndAccountKey().sort((a, b) => {
                        return new Date(b[1]).getTime() -
                          new Date(a[1]).getTime();
                      })[0];
                    const creditInfoInput = creditInfo.map((info) => {
                      return {
                        hash: info.keyHash,
                        userId: info.userId,
                        timestamp: info.timestamp,
                        latest: info.latest,
                      };
                    });
                    const latestIdentityKeyHash =
                      (await db.getAll("latestIdentityKeyHash")).map((info) => {
                        if (!info.key) {
                          return undefined;
                        }
                        return {
                          userId: info.key,
                          timestamp: info.timestamp,
                        };
                      }).filter((
                        info,
                      ): info is { userId: string; timestamp: string } =>
                        info !== undefined
                      );
                    const myIdenAndAcckeySign = await requester(
                      server,
                      "getIdentityKeyAndAccountKeySign",
                      {
                        keyHash: await keyHash(
                          myLatestIdentityKey[2].identityKey.public,
                        ),
                        sessionid: localStorage.getItem("sessionid"),
                      },
                    ).then((res) => res.json());
                    const roomKey = await generateRoomKey(
                      {
                        publicKey: myLatestIdentityKey[2].identityKey.public,
                        secretKey: myLatestIdentityKey[2].identityKey.private,
                      },
                      [
                        {
                          masterKey: friendMasterKey.masterKey,
                          identityKey: {
                            public: friendIdentitykeyAndAccountKey.identityKey,
                            sign: friendIdentitykeyAndAccountKey.idenSign,
                          },
                          accountKey: {
                            public: friendIdentitykeyAndAccountKey.accountKey,
                            sign: friendIdentitykeyAndAccountKey.accSign,
                          },
                          userId: talk.roomName,
                        },
                        {
                          masterKey: masterKey()?.public,
                          identityKey: {
                            public: myLatestIdentityKey[2].identityKey.public,
                            sign: myIdenAndAcckeySign.idenSign,
                          },
                          accountKey: {
                            public: myLatestIdentityKey[2].accountKey.public,
                            sign: myIdenAndAcckeySign.accSign,
                          },
                          userId: localStorage.getItem("userName") + "@" +
                            localStorage.getItem("server"),
                        },
                      ],
                      creditInfoInput,
                      latestIdentityKeyHash,
                    );
                    for(const credit of roomKey.updatedCreditMasterKey) {
                      const userid = credit.userId;
                      //useridのもののlatestをfalseにする
                      for(const info of creditInfo) {
                        if(info.userId === userid) {
                          await db.put("allowKeys", {
                            key: info.keyHash,
                            userId: info.userId,
                            timestamp: info.timestamp,
                            latest: false,
                            keyHash: info.keyHash,
                          });
                        }
                      }
                    }
                    for(const identimestamp of roomKey.updatedLatestIdentityKeyTimestamp) {
                      await db.put("latestIdentityKeyHash", {
                        key: identimestamp.userId,
                        timestamp: identimestamp.timestamp,
                      });
                    }
                    console.log(roomKey);
                  }
                } else {
                  alert("鍵が取得できませんでした");
                }
              }}
            >
              <img
                src={icons()[talk.roomName]
                  ? "data:image/jpg;base64," + icons()[talk.roomName]
                  : "/path/to/default/icon.png"}
                alt="icon"
                class="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <div class="font-semibold text-lg">
                  {nickNames()[talk.roomName] || talk.roomName}
                </div>
                <div class="text-xs text-gray-400">{talk.roomName}</div>
                <div class="text-sm text-gray-500"></div>
              </div>
            </div>
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
                const server = domain();
                if (!server) {
                  return;
                }
                console.log();
                const res = await requester(server, "requestFriend", {
                  sessionid: localStorage.getItem("sessionid"),
                  userName: addFriendByIdFormInput(),
                });
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
      {notification().map((n) => (
        <div class="bg-gray-800 text-white p-4 rounded-lg mb-3 shadow-lg transition-transform transform">
          <div class="mb-2">
            <div class="font-semibold text-lg mb-1">{n.type}</div>
            <div class="text-sm text-gray-300">{n.sender}</div>
          </div>
          <div class="mt-2 flex justify-end space-x-3">
            <button
              class="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-full shadow-sm transition-all"
              onClick={async () => {
                const server = domain();
                if (!server) return;
                const res = await requester(server, "acceptFriend", {
                  sessionid: localStorage.getItem("sessionid"),
                  id: n.id,
                });
                console.log(res);
              }}
            >
              Accept
            </button>
            <button
              class="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded-full shadow-sm transition-all"
              onClick={() => {
                // Handle reject action
                console.log(`Rejected notification from ${n.sender}`);
              }}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
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
                idenSign: identityAndAccount.identityKey.sign,
                accSign: identityAndAccount.accountKey.sign,
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
