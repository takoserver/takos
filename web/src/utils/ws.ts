import { useAtom, useSetAtom } from "solid-jotai";
import {
  deviceKeyState,
  domainState,
  loadState,
  sessionidState,
  webSocketState,
} from "./state";
import { createEffect, createRoot } from "solid-js";

import { messageListState, messageValueState } from "../utils/state.ts";
import { selectedRoomState } from "./roomState.ts";

export function createWebsocket(loadedFn: () => void) {
  createRoot(() => {
    const [domain] = useAtom(domainState);
    const [selectedRoom] = useAtom(selectedRoomState);
    const [sessionId] = useAtom(sessionidState);
    const [webSocket, setWebsocket] = useAtom(webSocketState);
    const setMessageList = useSetAtom(messageListState);
    const setLoad = useSetAtom(loadState);

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
          }
        }
      };
    });
  });
}
