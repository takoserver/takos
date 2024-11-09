import { useAtom, useSetAtom } from "solid-jotai";
import {
  birthdayState,
  deviceKeyState,
  domainState,
  EncryptedSessionState,
  iconState,
  IdentityKeyAndAccountKeyState,
  loadState,
  loginState,
  MasterKeyState,
  nicknameState,
  sessionidState,
  setUpState,
  webSocketState,
} from "../utils/state";
import {
  migrateKeyPrivateState,
  migrateRequestPage,
  migrateSessionid,
  migrateSignKeyPublicState,
  showMigrateRequest,
} from "../utils/migrateState";
import { requester } from "../utils/requester";
import { createTakosDB, localStorageEditor } from "../utils/idb";
import {
  decryptDataDeviceKey,
  DecryptDataKeyShareKey,
  DecryptDataMigrateKey,
  encryptDataDeviceKey,
  generateKeyShareKeys,
  keyHash,
  verifyDataKeyShareKey,
  verifyDataMasterKey,
  verifyDataMigrateSignKey,
} from "@takos/takos-encrypt-ink";
import { uuidv7 } from "uuidv7";
export function Loading() {
  return (
    <>
      <div class="w-full h-screen fixed z-[99999999999] flex bg-[#181818]">
        <div class="m-auto flex flex-col items-center">
          <div class="loader mb-4"></div>
          <div class="text-4xl text-center text-white">Loading...</div>
        </div>
      </div>
      <style>
        {`
        .loader {
          border: 8px solid rgba(255, 255, 255, 0.1);
          border-top: 8px solid #ffffff;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}
      </style>
    </>
  );
}

export function Load() {
  const [_load, setLoad] = useAtom(loadState);
  const [_login, setLogin] = useAtom(loginState);
  const [setUp, setSetUp] = useAtom(setUpState);
  const [deviceKey, setDeviceKey] = useAtom(deviceKeyState);
  const setWebSocket = useSetAtom(webSocketState);
  const setMasterKey = useSetAtom(MasterKeyState);
  const setIdentityKeyAndAccountKey = useSetAtom(IdentityKeyAndAccountKeyState);
  const [EncryptedSession, setEncryptedSession] = useAtom(
    EncryptedSessionState,
  );
  const [domain, setDomain] = useAtom(domainState);
  const [sessionId, setSessionid] = useAtom(sessionidState);
  const [migrateKeyPrivate] = useAtom(migrateKeyPrivateState);
  const [migrateSignKeyPublic] = useAtom(migrateSignKeyPublicState);
  const setIcon = useSetAtom(iconState);
  const setNickname = useSetAtom(nicknameState);
  const setBirthday = useSetAtom(birthdayState);
  const handleSessionFailure = () => {
    setLogin(false);
    setLoad(true);
  };

  const decryptKeyShareKeys = async (
    keyShareKeysIdb: any[],
    deviceKey: string,
  ) => {
    return Promise.all(keyShareKeysIdb.map(async (key) => {
      const keyShareKey = JSON.parse(
        await decryptDataDeviceKey(key.keyShareKey, deviceKey),
      );
      const keyShareSignKey = JSON.parse(
        await decryptDataDeviceKey(key.keyShareSignKey, deviceKey),
      );
      return [key.key, key.timestamp, keyShareKey, keyShareSignKey];
    }));
  };

  const decryptIdentityAndAccountKeys = async (
    keys: any[],
    deviceKey: string,
  ): Promise<
    [string, string, { identityKey: string; accountKey: string }][]
  > => {
    return Promise.all(keys.map(async (key) => {
      const identityKey = JSON.parse(
        await decryptDataDeviceKey(key.encryptedIdentityKey, deviceKey),
      );
      const accountKey = JSON.parse(
        await decryptDataDeviceKey(key.encryptedAccountKey, deviceKey),
      );
      return [key.hashHex, key.timestamp, { identityKey, accountKey }];
    }));
  };

  const processSessionInfo = async (response: any) => {
    console.log(response, "response");
    const db = await createTakosDB();
    const deviceKey = response.deviceKey;
    const encryptedMasterKey = localStorageEditor.get("masterKey");
    if (!encryptedMasterKey) return;
    const masterKey = JSON.parse(
      await decryptDataDeviceKey(encryptedMasterKey, response.deviceKey),
    );
    setMasterKey(masterKey);
    if (response.sharedDataIds.length !== 0) {
      const keyShareKeysIdb = await db.getAll("keyShareKeys");
      const keyShareKeys = await decryptKeyShareKeys(
        keyShareKeysIdb,
        response.deviceKey,
      );
      for (const sharedDataIds of response.sharedDataIds) {
        const server = domain();
        if (!server) {
          console.error("Invalid server");
          return;
        }
        const response = await requester(server, "getSharedData", {
          id: sharedDataIds,
          sessionid: sessionId(),
        });
        if (response.status !== 200) {
          console.error("Setup failed");
          return;
        }
        const data = await response.json();
        if (
          verifyDataMasterKey(
            data.keyShareSignKey,
            masterKey.public,
            data.keyShareSignKeySign,
          )
        ) {
          const keyShareKeyHash = JSON.parse(data.data).encryptedKeyHash;
          const keyShareKeyArray = keyShareKeys.find((key) =>
            key[0] === keyShareKeyHash
          );
          if (!keyShareKeyArray) {
            console.error("Invalid key share key");
            return;
          }
          const keyShareKey = keyShareKeyArray[2].private;
          if (!keyShareKey) {
            console.error("Invalid key share key");
            return;
          }
          const decryptData = await DecryptDataKeyShareKey(
            data.data,
            keyShareKey,
          );
          if (
            !verifyDataKeyShareKey(decryptData, data.keyShareSignKey, data.sign)
          ) {
            console.error("Invalid key share key");
            return;
          }
          if (data.type === "key") {
            const keysObject = JSON.parse(decryptData);
            const identityKey = keysObject.identityKey;
            const accountKey = keysObject.accountKey;
            const encryptedIdentityKey = await encryptDataDeviceKey(
              JSON.stringify(identityKey),
              deviceKey,
            );
            const encryptedAccountKey = await encryptDataDeviceKey(
              JSON.stringify(accountKey),
              deviceKey,
            );
            await db.put("identityAndAccountKeys", {
              encryptedIdentityKey,
              encryptedAccountKey,
              hashHex: await keyHash(identityKey.public),
              sended: true,
              key: await keyHash(identityKey.public),
              timestamp: identityKey.public.timestamp,
            });
            const res = await requester(server, "noticeGetSharedData", {
              id: sharedDataIds,
              sessionid: sessionId(),
            })
          }
        }
      }
    }
    const identityAndAccountKeys = await db.getAll("identityAndAccountKeys");
    const decryptedKeys = await decryptIdentityAndAccountKeys(
      identityAndAccountKeys,
      response.deviceKey,
    );
    setIdentityKeyAndAccountKey(decryptedKeys);
    setSetUp(response.setuped);
    setEncryptedSession(response.sessionEncrypted);
    setLogin(true);
  }

  const loadSession = async () => {
    const sessionid = localStorageEditor.get("sessionid");
    const serverDomain = localStorageEditor.get("server");
    if (!serverDomain || !sessionid) {
      handleSessionFailure();
      return;
    }

    setDomain(serverDomain);
    setSessionid(sessionid);

    try {
      const sessionInfo = await requester(serverDomain, "getSessionInfo", {
        sessionid,
      });
      if (sessionInfo.status === 200) {
        const response = await sessionInfo.json();
        setDeviceKey(response.deviceKey);
        if (response.sessionEncrypted) {
          processSessionInfo(response);
        } else {
          setSetUp(response.setuped);
          setLogin(true);
          setLoad(true);
          setEncryptedSession(false);
        }
        const profile = await requester(serverDomain, "getProfile", {
          sessionid,
        });
        if (profile.status === 200) {
          const response = await profile.json();
          setIcon(response.icon);
          setNickname(response.nickName);
          setBirthday(response.birthday);
        }
        const websocket = new WebSocket(
          `wss://${domain()}/takos/v2/client/ws?sessionid=${sessionId()}`,
        );
        websocket.onopen = () => {
          setWebSocket(websocket);
          console.log("Session loaded");
          setLoad(true);
        };
        websocket.onclose = () => {
          setLoad(false);
        };
        const setShowMigrate = useSetAtom(showMigrateRequest);
        const setMigrateSessionid = useSetAtom(migrateSessionid);
        websocket.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "requestMigrateSignKey": {
              setShowMigrate(true);
              setMigrateSessionid(data.data.migrateid);
              break;
            }
            case "noticeMigrateSignKey": {
              const setMigratePage = useSetAtom(migrateRequestPage);
              const setMigrateSignKeyPublic = useSetAtom(
                migrateSignKeyPublicState,
              );
              setMigratePage(3);
              setMigrateSignKeyPublic(data.data.migrateSignKey);
              break;
            }
            case "noticeSendMigrateData": {
              const setMigratePage = useSetAtom(migrateRequestPage);
              setMigratePage(4);
              const migrateData = data.data.migrateData;
              const migrateSign = data.data.sign;
              if (
                !verifyDataMigrateSignKey(
                  migrateData,
                  migrateSignKeyPublic(),
                  migrateSign,
                )
              ) {
                console.error("Invalid migrate sign key");
                return;
              }
              const decryptedMigrateData: {
                masterKey: string;
                IdentityKeyAndAccountKey: any[];
                allowkeys: any[];
              } = JSON.parse(
                await DecryptDataMigrateKey(migrateData, migrateKeyPrivate()),
              );
              if (!decryptedMigrateData) {
                console.error("Invalid migrate key");
                return;
              }
              const deviceKeyValue = deviceKey();
              if (!deviceKeyValue) {
                console.error("Invalid device key");
                return;
              }
              const encryptedMasterKey = await encryptDataDeviceKey(
                decryptedMigrateData.masterKey,
                deviceKeyValue,
              );
              localStorageEditor.set("masterKey", encryptedMasterKey);
              const db = await createTakosDB();
              await db.clear("identityAndAccountKeys");
              await db.clear("keyShareKeys");
              await db.clear("allowKeys");
              for (const key of decryptedMigrateData.IdentityKeyAndAccountKey) {
                await db.put("identityAndAccountKeys", {
                  encryptedIdentityKey: await encryptDataDeviceKey(
                    JSON.stringify(key.identityKey),
                    deviceKeyValue,
                  ),
                  encryptedAccountKey: await encryptDataDeviceKey(
                    JSON.stringify(key.accountKey),
                    deviceKeyValue,
                  ),
                  hashHex: key.hashHex,
                  sended: false,
                  key: key.hashHex,
                  timestamp: key.timestamp,
                });
              }
              for (const key of decryptedMigrateData.allowkeys) {
                await db.put("allowKeys", {
                  key: key.key,
                  keyHash: key.keyHash,
                  userId: key.userId,
                  timestamp: key.timestamp,
                  latest: key.latest,
                });
              }
              const sessionUUID = uuidv7();
              const keyShareKeys = await generateKeyShareKeys(
                JSON.parse(decryptedMigrateData.masterKey),
                sessionUUID,
              );
              const server = domain();
              if (!server) {
                console.error("Invalid server");
                return;
              }
              const response = await requester(server, "encryptSession", {
                keyShareKey: keyShareKeys.keyShareKey.public,
                keyShareSignKey: keyShareKeys.keyShareSignKey.public,
                keyShareSignKeySign: keyShareKeys.keyShareSignKey.sign,
                keyShareKeySign: keyShareKeys.keyShareKey.sign,
                sessionUUID: sessionUUID,
                sessionid: sessionId(),
              });
              if (response.status !== 200) {
                console.error("Setup failed");
                return;
              }
              const keyShareTimestamp =
                (JSON.parse(keyShareKeys.keyShareKey.public)).timestamp;
              const keyShareKeyHash = await keyHash(
                keyShareKeys.keyShareKey.public,
              );
              const encryptedkeyShareKey = await encryptDataDeviceKey(
                JSON.stringify(keyShareKeys.keyShareKey),
                deviceKeyValue,
              );
              const encryptedkeyShareSignKey = await encryptDataDeviceKey(
                JSON.stringify(keyShareKeys.keyShareSignKey),
                deviceKeyValue,
              );
              localStorageEditor.set("sessionuuid", sessionUUID);
              await db.put("keyShareKeys", {
                keyShareKey: encryptedkeyShareKey,
                keyShareSignKey: encryptedkeyShareSignKey,
                timestamp: keyShareTimestamp,
                key: keyShareKeyHash,
                keyHash: keyShareKeyHash,
              });
              alert("Migrate success");
              window.location.reload();
              break;
            }
          }
        };
      } else {
        handleSessionFailure();
      }
    } catch (error) {
      console.error("Session loading failed:", error);
      handleSessionFailure();
    }
  };
  loadSession();
  return <></>;
}
