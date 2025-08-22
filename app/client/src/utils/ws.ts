import { apiUrl } from "./config.ts";

let socket: WebSocket | null = null;
const dmHandlers: (() => void)[] = [];
let currentUser: string | null = null;

export function connectWebSocket(): WebSocket {
  if (socket) return socket;
  const url = apiUrl("/api/ws").replace(/^http/, "ws");
  socket = new WebSocket(url);
  socket.onopen = () => {
    if (currentUser) {
      socket?.send(
        JSON.stringify({ type: "register", payload: { user: currentUser } }),
      );
    }
  };
  socket.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === "hasUpdate" && msg.payload?.kind === "dm") {
        for (const h of dmHandlers) h();
      }
    } catch (err) {
      console.error("ws message error", err);
    }
  };
  return socket;
}

export function registerUser(user: string) {
  currentUser = user;
  if (!socket) {
    connectWebSocket();
    return;
  }
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({ type: "register", payload: { user } }),
    );
  }
}

export function addDMUpdateHandler(handler: () => void) {
  dmHandlers.push(handler);
}

export function removeDMUpdateHandler(handler: () => void) {
  const idx = dmHandlers.indexOf(handler);
  if (idx >= 0) dmHandlers.splice(idx, 1);
}

export function getWebSocket(): WebSocket | null {
  return socket;
}
