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
import { clearDB, createTakosDB, localStorageEditor } from "../../utils/idb";
import { requester } from "../../utils/requester";
import { PopUpFrame, PopUpInput, PopUpLabel, PopUpTitle } from "../popUpFrame";
import { createEffect, createSignal } from "solid-js";
import { checkUserName } from "../../../../takos/utils/checks";
import { splitUserName } from "../../../../takos-web/util/takosClient";
import {
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
  const handelSelectRoomFriend = async (talk: any) => {
    const db = await createTakosDB();
    setSelectedRoom({
      type: "friend",
      roomName: talk.roomName,
    });
    setIsSelectRoom(true);
    const latestRoomKeyhash = await db.getAll("latestRoomkeyHash");
    if (latestRoomKeyhash.length === 0) {
      const roomKey = await generateRoomkey(
        localStorageEditor.get("sessionuuid") as string,
      );
      if (!roomKey) {
        console.error("Failed to generate room key");
        return;
      }
      const friendMasterKey = await requester(
        splitUserName(talk.roomName).domain,
        "getMasterKey",
        {
          userName: splitUserName(talk.roomName).userName,
        },
      );
      const friendAccountKey = await requester(
        splitUserName(talk.roomName).domain,
        "getAccountKeyLatest",
        {
          userName: splitUserName(talk.roomName).userName,
        },
      );
      if (friendMasterKey.status !== 200 || friendAccountKey.status !== 200) {
        console.error("Failed to get friend master key");
        return;
      }
      const friendMasterKeyJson = await friendMasterKey.json();
      const friendAccountKeyJson = await friendAccountKey.json();
      const myIdentityKeyEncrypted =
        (await db.getAll("identityKeys")).sort((a, b) =>
          a.timestamp - b.timestamp
        )[0];
      const myAccountKeyEncryptedHash =
        (await db.getAll("accountKeys")).sort((a, b) =>
          a.timestamp - b.timestamp
        )[0].key;
      const myIdentityKey = await decryptDataDeviceKey(
        deviceKey()!,
        myIdentityKeyEncrypted.encryptedKey,
      );
      if (!myIdentityKey) {
        console.error("Failed to decrypt my identity key");
        return;
      }
      const myAccountKey = await requester(
        domain() as string,
        "getAccountKey",
        {
          hash: myAccountKeyEncryptedHash,
          userName: localStorageEditor.get("userName"),
        },
      ).then((res) => res.json());
      if (!myAccountKey) {
        console.error("Failed to get my account key");
        return;
      }
      if (
        await keyHash(myAccountKey.accountKey) !== myAccountKeyEncryptedHash
      ) {
        console.error("Invalid identity key");
        return;
      }
      const encryptedRoomKey = await encryptRoomKeyWithAccountKeys(
        [
          {
            masterKey: friendMasterKeyJson.masterKey,
            accountKey: friendAccountKeyJson.accountKey,
            accountKeySign: friendAccountKeyJson.accSign,
            userId: talk.roomName,
          },
          {
            //@ts-ignore
            masterKey: masterKey()!.publicKey,
            accountKey: myAccountKey.accountKey,
            accountKeySign: myAccountKey.sign,
            userId: localStorageEditor.get("userName") + "@" +
              localStorageEditor.get("server"),
          },
        ],
        roomKey,
        myIdentityKey,
      );
      if (!encryptedRoomKey) {
        console.error("Failed to encrypt room key");
        return;
      }
      const res = await requester(domain() as string, "updateRoomKey", {
        roomid: talk.roomName,
        metaData: encryptedRoomKey.metadata,
        metaDataSign: encryptedRoomKey.metadataSign,
        roomType: "friend",
        encryptedKey: encryptedRoomKey.encryptedData,
        sign: encryptedRoomKey.sign,
        sessionid: localStorage.getItem("sessionid"),
      });
    } else {
    }
  };

  return (
    <>
      {talkList()?.map((talk) => {
        if (talk.type === "friend") {
          return (
            <div
              class="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[#282828]"
              onClick={async () => {
                await handelSelectRoomFriend(talk);
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
              if(!masterKeyValue) return;
              const acccountKey = await generateAccountKey(
                {
                  //@ts-ignore
                  privateKey: masterKeyValue.privateKey,
                  //@ts-ignore
                  publicKey: masterKeyValue.publicKey,
                }
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
