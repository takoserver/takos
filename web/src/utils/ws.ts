import { useAtom, useSetAtom } from "solid-jotai";
import {
  deviceKeyState,
  domainState,
  loadState,
  sessionidState,
  webSocketState,
} from "./state";
import { createEffect, createRoot } from "solid-js";
import {
  migrateKeyPrivateState,
  migrateKeyPublicState,
  migrateRequestPage,
  migrateSessionid,
  migrateSignKeyPublicState,
} from "./migrateState.ts";

import { messageListState, messageValueState } from "../utils/state.ts";
import { selectedRoomState } from "./roomState.ts";

import { migrateRequestState } from "../components/MigrateKeys.tsx";
import {
  decryptDataMigrateKey,
  encryptDataDeviceKey,
  generateShareKey,
  keyHash,
  verifyDataMigrateSignKey,
} from "@takos/takos-encrypt-ink";
import { createTakosDB } from "./idb.ts";

export function createWebsocket(loadedFn: () => void) {
  createRoot(() => {
    const [domain] = useAtom(domainState);
    const [selectedRoom] = useAtom(selectedRoomState);
    const [sessionId] = useAtom(sessionidState);
    const [webSocket, setWebsocket] = useAtom(webSocketState);
    const setMigrateRequest = useSetAtom(migrateRequestState);
    const setMessageList = useSetAtom(messageListState);
    const setLoad = useSetAtom(loadState);
    const [migrateSessioonId, setMigrateSessioonId] = useAtom(migrateSessionid);
    const [migrateKeyPublic, setMigrateKeyPublic] = useAtom(
      migrateKeyPublicState,
    );
    const [migrateSignKeyPublic, setMigrateSignKeyPublic] = useAtom(
      migrateSignKeyPublicState,
    );
    const [page, setPage] = useAtom(migrateRequestPage);
    const [migrateKeyPrivate] = useAtom(migrateKeyPrivateState);
    const [deviceKey] = useAtom(deviceKeyState);
    createEffect(() => {
      const websocket = new WebSocket(
        `./api/v2/ws`,
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
          case "message": {
            const messageData = JSON.parse(data.data);
            if (selectedRoom()?.roomid === messageData.roomid) {
              setMessageList((prev) => [...prev, messageData]);
            }
            break;
          }
          case "migrateRequest": {
            const data2: { migrateid: string; migrateKey: string } = JSON.parse(
              data.data,
            );
            if (data2.migrateid === migrateSessioonId()) {
              return;
            }
            setMigrateRequest(true);
            setMigrateSessioonId(data2.migrateid);
            setMigrateKeyPublic(data2.migrateKey);
            break;
          }
          case "migrateAccept": {
            const data2: { migrateid: string; migrateSignKey: string } = JSON
              .parse(
                data.data,
              );
            if (data2.migrateid === migrateSessioonId()) {
              setMigrateSignKeyPublic(data2.migrateSignKey);
              setPage(3);
            }
            break;
          }
          case "migrateData": {
            const data2: {
              migrateid: string;
              data: string;
              sign: string;
            } = JSON.parse(data.data);
            if (data2.migrateid === migrateSessioonId()) {
              const migrateKey = migrateKeyPrivate();
              const migrateSignKey = migrateSignKeyPublic();
              if (!migrateKey || !migrateSignKey) {
                return;
              }
              const verify = verifyDataMigrateSignKey(
                migrateSignKey,
                data2.sign,
                data2.data,
              );
              if (!verify) {
                return;
              }
              const decryptData = await decryptDataMigrateKey(
                migrateKey,
                data2.data,
              );
              const decryptDataJson: {
                masterKey: string;
                accountKeys: {
                  key: string;
                  rawKey: string;
                  timestamp: number;
                }[];
                allowKeys: {
                  key: string;
                  latest: boolean;
                  timestamp: number;
                  userId: string;
                }[];
              } = JSON.parse(decryptData!);
              const db = await createTakosDB();
              const deviceKeyS = deviceKey();
              if (!deviceKeyS) {
                return;
              }
              const encryptedMasterKey = await encryptDataDeviceKey(
                deviceKeyS,
                decryptDataJson.masterKey,
              );
              const encryptedAccountKeys: {
                key: string; //hash
                encryptedKey: string;
                timestamp: number;
              }[] = [];
              for (const accountKey of decryptDataJson.accountKeys) {
                console.log(accountKey);
                const encryptedKey = await encryptDataDeviceKey(
                  deviceKeyS,
                  accountKey.rawKey,
                );
                if (!encryptedKey) continue;
                encryptedAccountKeys.push({
                  key: accountKey.key,
                  encryptedKey,
                  timestamp: accountKey.timestamp,
                });
              }
              if (!encryptedMasterKey) return;
              const shareKey = await generateShareKey(
                JSON.parse(decryptDataJson.masterKey).privateKey,
                localStorage.getItem("sessionUUID")!,
              );
              if (!shareKey) return;
              const res = await fetch("./api/v2/sessions/encrypt/success", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  shareKey: shareKey.publickKey,
                  shareKeySign: shareKey.sign,
                }),
              });
              if (res.status !== 200) {
                return;
              }
              const encryptedShareKey = await encryptDataDeviceKey(
                deviceKeyS,
                shareKey.privateKey,
              );
              await db.put("shareKeys", {
                key: await keyHash(shareKey.publickKey),
                encryptedKey: encryptedShareKey!,
                timestamp: JSON.parse(shareKey.publickKey).timestamp,
              });
              localStorage.setItem("masterKey", encryptedMasterKey);
              for (const accountKey of encryptedAccountKeys) {
                await db.put("accountKeys", accountKey);
              }
              for (const allowKey of decryptDataJson.allowKeys) {
                await db.put("allowKeys", allowKey);
              }
              alert("Migrate Success");
              window.location.reload();
            }
          }
        }
      };
    });
  });
}
