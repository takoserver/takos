import type { WSContext } from "hono/ws";
interface WebSocketSessionObject {
  ws: WSContext;
  roomid: string;
  roomType: string;
  userName: string;
  lastActivityTime: Date;
}
export function keyShareRequest(
  sessions: Map<string, WebSocketSessionObject>,
  userName: string,
  keyShareSessionId: string,
) {
    resetSession(sessions);
  //同じユーザー名のセッションを取得
  const session = Array.from(sessions.values()).find((s) =>
    s.userName === userName
  );
  if (!session) return;
  //セッションにキーシェアリクエストを送信
  const result = {
    type: "keyShareRequest",
    keyShareSessionId,
  }
    Array.from(sessions.values()).forEach((session) => {
        if(session.userName === userName) {
            session.ws.send(JSON.stringify(result));
        }
    });
}

export function keyShareAccept(
  sessions: Map<string, WebSocketSessionObject>,
  userName: string,
  keyShareSessionId: string,
) {
    resetSession(sessions);
  //同じユーザー名のセッションを取得
  const session = Array.from(sessions.values()).find((s) =>
    s.userName === userName
  );
  if (!session) return;
  const result = {
    type: "keyShareAccept",
    keyShareSessionId,
  }
  Array.from(sessions.values()).forEach((session) => {
    if(session.userName === userName) {
        console.log("send keyShareData");
        session.ws.send(JSON.stringify(result));
    }
});
}

export function keyShareData(
  sessions: Map<string, WebSocketSessionObject>,
  userName: string,
  keyShareSessionId: string,
) {
    resetSession(sessions);
    const result = {
        type: "keyShareData",
        keyShareSessionId,
    };
    //同じユーザー名のセッションにresultを送信
    Array.from(sessions.values()).forEach((session) => {
        if(session.userName === userName) {
            session.ws.send(JSON.stringify(result));
        }
    });
}
function resetSession(
    sessions: Map<string, WebSocketSessionObject>,
) {
    sessions.forEach((session, key) => {
        if(session.ws.readyState === WebSocket.CLOSED) {
            sessions.delete(key);
        }
    });
}