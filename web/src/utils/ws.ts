import { useAtom, useAtomValue, useSetAtom } from "solid-jotai";
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
import { selectedRoomState } from "./room/roomState.ts";

import { migrateRequestState } from "../components/encrypted/MigrateKeys.tsx";
import {
  decryptDataMigrateKey,
  encryptDataDeviceKey,
  generateShareKey,
  keyHash,
  verifyDataMigrateSignKey,
} from "@takos/takos-encrypt-ink";
import { createTakosDB } from "./storage/idb.ts";

export function createWebsocket(loadedFn: () => void) {
  createRoot(() => {
    const selectedRoom = useAtomValue(selectedRoomState);
    const setWebsocket = useSetAtom(webSocketState);
    const setMigrateRequest = useSetAtom(migrateRequestState);
    const setMessageList = useSetAtom(messageListState);
    const setLoad = useSetAtom(loadState);
    const [migrateSessioonId, setMigrateSessioonId] = useAtom(migrateSessionid);
    const setMigrateKeyPublic = useSetAtom(migrateKeyPublicState);
    const [migrateSignKeyPublic, setMigrateSignKeyPublic] = useAtom(
      migrateSignKeyPublicState,
    );
    const setPage = useSetAtom(migrateRequestPage);
    const migrateKeyPrivate = useAtomValue(migrateKeyPrivateState);
    const deviceKey = useAtomValue(deviceKeyState);

    // 再接続関連の変数
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    let reconnectTimeout: number | null = null;

    // WebSocketを接続する関数
    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const websocket = new WebSocket(
        `${protocol}//${host}/api/v2/ws`,
      );

      websocket.onopen = () => {
        setWebsocket(websocket);
        loadedFn();
        reconnectAttempts = 0; // 接続成功したらカウンターをリセット
        console.log("WebSocket接続成功");
      };

      websocket.onclose = () => {
        setLoad(false);
        // 再接続ロジック
        if (reconnectAttempts < maxReconnectAttempts) {
          // 指数バックオフによる待機時間の計算（最大30秒）
          const timeout = Math.min(
            1000 * Math.pow(2, reconnectAttempts),
            30000,
          );
          console.log(`WebSocket切断。${timeout / 1000}秒後に再接続します...`);

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }

          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket();
          }, timeout) as unknown as number;
        } else {
          console.error(
            "最大再接続回数に達しました。ページを更新してください。",
          );
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocketエラー:", error);
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
              const res = await fetch("/api/v2/sessions/encrypt/success", {
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
    };

    createEffect(() => {
      // 最初の接続を開始
      connectWebSocket();
    });
  });
}
