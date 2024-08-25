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
  //同じユーザー名のセッションを取得
  const session = Array.from(sessions.values()).find((s) =>
    s.userName === userName
  );
  if (!session) return;
  //セッションにキーシェアリクエストを送信
  session.ws.send(JSON.stringify({
    type: "keyShareRequest",
    keyShareSessionId,
  }));
}

export function keyShareAccept(
  sessions: Map<string, WebSocketSessionObject>,
  userName: string,
  keyShareSessionId: string,
) {
  //同じユーザー名のセッションを取得
  const session = Array.from(sessions.values()).find((s) =>
    s.userName === userName
  );
  if (!session) return;
  //セッションにキーシェアリクエストを送信
  session.ws.send(JSON.stringify({
    type: "keyShareAccept",
    keyShareSessionId,
  }));
}

export function keyShareData(
  sessions: Map<string, WebSocketSessionObject>,
  userName: string,
  keyShareSessionId: string,
) {
  //同じユーザー名のセッションを取得
  const session = Array.from(sessions.values()).find((s) =>
    s.userName === userName
  );
  if (!session) return;
  //セッションにキーシェアリクエストを送信
  session.ws.send(JSON.stringify({
    type: "keyShareData",
    keyShareSessionId,
  }));
}
