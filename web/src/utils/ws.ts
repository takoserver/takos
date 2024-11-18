import { useAtom, useSetAtom } from "solid-jotai";
import {
    deviceKeyState,
  domainState,
  loadState,
  sessionidState,
  webSocketState,
} from "./state";
import {
  migrateKeyPrivateState,
  migrateRequestPage,
  migrateSessionid,
  migrateSignKeyPublicState,
  showMigrateRequest,
} from "./migrateState";
import { decryptDataMigrateKey, encryptDataDeviceKey, generateIdentityKey, generateShareKey, keyHash, verifyDataMigrateSignKey } from "@takos/takos-encrypt-ink";
import { createEffect, createRoot } from "solid-js";
import { createTakosDB, localStorageEditor } from "./idb";
import { uuidv7 } from "uuidv7";
import { requester } from "./requester";

export function createWebsocket(loadedFn: () => void) {
  createRoot(() => {
    const [domain] = useAtom(domainState);
    const [sessionId] = useAtom(sessionidState);
    const [webSocket, setWebsocket] = useAtom(webSocketState);
    const setLoad = useSetAtom(loadState);
    const setShowMigrate = useSetAtom(showMigrateRequest);
    const setMigrateSessionid = useSetAtom(migrateSessionid);
    const [migrateKeyPrivate] = useAtom(migrateKeyPrivateState);
    const [migrateSignKeyPublic] = useAtom(migrateSignKeyPublicState);
    const [deviceKey] = useAtom(deviceKeyState);

    createEffect(() => {
      const websocket = new WebSocket(
        `wss://${domain()}/takos/v2/client/ws?sessionid=${sessionId()}`,
      );

      websocket.onopen = () => {
        setWebsocket(websocket);
        loadedFn();
      };

      websocket.onclose = () => {
        setLoad(false);
      };

      websocket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
        switch (data.type) {
          case "requestMigrateSignKey": {
            setShowMigrate(true);
            setMigrateSessionid(data.data.migrateid);
            break;
          }
          case "noticeMigrateSignKey": {
            console.log("noticeMigrateSignKey");
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
                migrateSignKeyPublic(),
                migrateSign,
                migrateData,
              )
            ) {
              console.error("Invalid migrate sign key");
              return;
            }
            const decryptedData = JSON.parse(await decryptDataMigrateKey(
                migrateKeyPrivate(),
                migrateData,
            ) as string)
            const encryptedMasterKey = await encryptDataDeviceKey(
                deviceKey() as string,
                JSON.stringify(decryptedData.masterKey),
            );
            if(!encryptedMasterKey) throw new Error("encrypted key is not generated");
            localStorageEditor.set("masterKey", encryptedMasterKey);
            const db = await createTakosDB();
            for(const accountKey of decryptedData.accountKeys) {
              const encryptedAccountKey = await encryptDataDeviceKey(
                    deviceKey() as string,
                    accountKey.key
              );
            if(!encryptedAccountKey) throw new Error("encrypted key is not generated");
            await db.put("accountKeys", {
              key: await keyHash(accountKey.key),
              encryptedKey: encryptedAccountKey,
              timestamp: accountKey.timestamp,
            });
            }
            const uuid = uuidv7();
            localStorageEditor.set("sessionuuid", uuid);
            console.log(JSON.parse(decryptedData.masterKey));
            const identityKey = await generateIdentityKey(uuid, JSON.parse(decryptedData.masterKey).privateKey);
            if(!identityKey) throw new Error("Failed to create identity key");
            const encryptedIdentityKey = await encryptDataDeviceKey(
                deviceKey() as string,
                identityKey.privateKey,
            );
            if(!encryptedIdentityKey) throw new Error("encrypted key is not generated");
            await db.put("identityKeys", {
              key: await keyHash(identityKey.publickKey),
              encryptedKey: encryptedIdentityKey,
              timestamp: JSON.parse(identityKey.publickKey).timestamp,
            });
            const shareKey = await generateShareKey(
                JSON.parse(decryptedData.masterKey).privateKey,
                uuid,
            );
            if(!shareKey) throw new Error("Failed to create share key");
            const encryptedShareKey = await encryptDataDeviceKey(
                deviceKey() as string,
                shareKey.privateKey,
            );
            if(!encryptedShareKey) throw new Error("encrypted key is not generated");
            await db.put("shareKeys", {
              key: await keyHash(shareKey.publickKey),
              encryptedKey: encryptedShareKey,
              timestamp: JSON.parse(shareKey.publickKey).timestamp,
            });
            const res = await requester(domain() as string, "encryptSession", {
                shareKey: shareKey.publickKey,
                shareKeySign: shareKey.sign,
                sessionUUID: uuid,
                identityKey: identityKey.publickKey,
                identityKeySign: identityKey.sign,
                sessionid: sessionId(),
            });
            if(res.status !== 200) throw new Error("Failed to migrate complete");
            alert("Migrate complete");
            break;
          }
        }
      };
    });
  });
}
