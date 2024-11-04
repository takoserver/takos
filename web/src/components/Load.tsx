import { useAtom, useSetAtom } from "solid-jotai";
import {
  deviceKeyState,
  domainState,
  EncryptedSessionState,
  IdentityKeyAndAccountKeyState,
  loadState,
  loginState,
  MasterKeyState,
  sessionidState,
  setUpState,
  webSocketState,
} from "../utils/state";
import {
  showMigrateRequest,
  migrateSessionid,
  migrateRequestPage,
  migrateSignKeyPublicState,
} from "../utils/migrateState";
import { requester } from "../utils/requester";
import { createTakosDB, localStorageEditor } from "../utils/idb";
import { decryptDataDeviceKey } from "@takos/takos-encrypt-ink";
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
    const db = await createTakosDB();
    if (response.sharedDataIds.length !== 0) {
      const keyShareKeysIdb = await db.getAll("keyShareKeys");
      const keyShareKeys = await decryptKeyShareKeys(
        keyShareKeysIdb,
        response.deviceKey,
      );
      for (const sharedDataIds of response.sharedDataIds) {
        // TODO: Process shared data with keyShareKeys
      }
    }

    const encryptedMasterKey = localStorageEditor.get("masterKey");
    if (!encryptedMasterKey) return;
    const masterKey = JSON.parse(
      await decryptDataDeviceKey(encryptedMasterKey, response.deviceKey),
    );
    setMasterKey(masterKey);

    const identityAndAccountKeys = await db.getAll("identityAndAccountKeys");
    const decryptedKeys = await decryptIdentityAndAccountKeys(
      identityAndAccountKeys,
      response.deviceKey,
    );
    setIdentityKeyAndAccountKey(decryptedKeys);
    setSetUp(response.setuped);
    setEncryptedSession(response.sessionEncrypted);
    setLogin(true);
  };

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
        const websocket = new WebSocket(`wss://${domain()}/takos/v2/client/ws?sessionid=${sessionId()}`);
        websocket.onopen = () => {
          setWebSocket(websocket);
          setLoad(true);
        }
        websocket.onclose = () => {
          setLoad(false)
        }
        const setShowMigrate = useSetAtom(showMigrateRequest);
        const setMigrateSessionid = useSetAtom(migrateSessionid);
        websocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log(data);
          switch(data.type) {
            case "requestMigrateSignKey": {
              setShowMigrate(true);
              setMigrateSessionid(data.data.migrateid);
              break;
            }
            case "noticeMigrateSignKey": {
              const setMigratePage = useSetAtom(migrateRequestPage);
              const setMigrateSignKeyPublic = useSetAtom(migrateSignKeyPublicState);
              setMigratePage(3);
              setMigrateSignKeyPublic(data.data.migrateSignKey);
             }
          }
        }
        
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
