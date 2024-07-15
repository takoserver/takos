import { getCookies } from "$std/http/cookie.ts";
import ssessionID from "../../../../models/sessionid.ts";
import users from "../../../../models/users.ts";
import rooms from "../../../../models/rooms.ts";
import redis from "redis";
import pubClient from "../../../../util/redisClient.ts";
import messages from "../../../../models/messages.ts";
import { WebSocketJoiningFriend, WebSocketJoiningRoom, WebSocketSessionObject } from "../../../../util/types.ts";
import { load } from "$std/dotenv/mod.ts";
import friends from "../../../../models/friends.ts";
import takos from "../../../../util/takos.ts";
import remoteFriends from "../../../../models/remoteFriends.ts";
import { generate } from "https://deno.land/std@0.62.0/uuid/v4.ts";
const env = await load();
const redisURL = env["REDIS_URL"];
const redisch = env["REDIS_CH"];
const maxMessage = Number(env["MAX_MESSAGE_LENGTH"]);
const subClient = redis.createClient({
  url: redisURL,
});
/**メインコンテンツ開始 */
await subClient.connect();
async function subscribeMessage(channel: string | string[]) {
  await subClient.subscribe(channel, async (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case "textMessage": {
        const sessionid = data.sessionid;
        const session = sessions.get(sessionid);
        if (!session) {
          return;
        }
        const message = data.message;
        if (typeof message !== "string") {
          return;
        }
        if (message.length > maxMessage) {
          return;
        }
        const roomid = session.roomid;
        const room = await rooms.findOne({ uuid: roomid });
        if (!room) {
          return;
        }
        await messages.create(
          {
            roomid: roomid,
            userid: session.userid,
            messageid: generate(),
            message: message,
            messageType: "text",
            read: [
              {
                userid: session.userid,
              },
            ],
          },
        );
        break;
      }
      default:
        break;
    }
  });
}
/**メインコンテンツ終了*/
await subscribeMessage(redisch);
const sessions = new Map<string, WebSocketSessionObject>();
export const handler = {
  GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      });
    }
    if (req.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.onopen = async () => {
        //sessionidを取得
        const cookies = getCookies(req.headers);
        const sessionid = cookies.sessionid;
        const isTrueSessionid = await ssessionID.findOne({ sessionID: sessionid });
        if (!isTrueSessionid) {
          console.log("Invalid SessionID", sessionid);
          socket.close(1000, "Invalid SessionID");
          return;
        }
        const user = await users.findOne({ uuid: isTrueSessionid.userid });
        if (!user) {
          console.log("Invalid User");
          socket.close(1000, "Invalid User");
          return;
        }
        sessions.set(sessionid, {
          userid: isTrueSessionid.userid,
          ws: socket,
          roomid: "",
          roomType: "",
          lastActivityTime: new Date(),
        });
        socket.send(JSON.stringify({ type: "connected", sessionid }));
      };
      socket.onmessage = async function (event) {
        const data = JSON.parse(event.data);
        if (data.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
          UpdateLastActivityTime(data.sessionid);
          return;
        }
        if (data.type === "joinFriend") {
          const value = data as WebSocketJoiningFriend;
          const session = sessions.get(value.sessionid);
          if (!session) {
            socket.send(JSON.stringify({ type: "error", message: "Invalid SessionID" }));
            return;
          }
          const friendId = value.friendid;
          const friendList = await friends.findOne({ user: ctx.state.data.userid });
          if (!friendList) {
            socket.send(JSON.stringify({ type: "error", message: "Invalid FriendID" }));
            return;
          }
          let friendInfo;
          if (takos.splitUserName(friendId).domain !== env["DOMAIN"]) {
            friendInfo = await remoteFriends.findOne({ userName: takos.splitUserName(friendId).userName, host: takos.splitUserName(friendId).domain });
          } else {
            friendInfo = await users.findOne({ userName: takos.splitUserName(friendId).userName });
          }
          if (!friendInfo) {
            socket.send(JSON.stringify({ type: "error", message: "Invalid FriendID" }));
            return;
          }
          const friend = friendList.friends.find((friend) => friend.userid === friendInfo.uuid);
          if (!friend) {
            socket.send(JSON.stringify({ type: "error", message: "Invalid FriendID" }));
            return;
          }
          const roomid = friend.room;
          const room = await rooms.findOne({ uuid: roomid });
          if (!room) {
            socket.send("Invalid RoomID");
            return;
          }
          if (typeof room.types === "string" && typeof room.uuid === "string") {
            session.roomid = room.uuid;
            session.roomType = room.types;
          }
          sessions.set(value.sessionid, session);
          //ルームに参加したことを通知
          if (typeof room.uuid === "string") {
            pubClient.publish(room.uuid, JSON.stringify({ type: "join", userid: session.userid }));
          }
          session.ws.send(JSON.stringify({ type: "joined", roomType: room.types, friendid: value.friendid }));
          UpdateLastActivityTime(value.sessionid);
          return;
        }
        if (data.type === "joinRoom") {
          const value = data as WebSocketJoiningRoom;
          const session = sessions.get(value.sessionid);
          if (!session) {
            socket.close(1000, "Invalid SessionID");
            return;
          }
          const room = await rooms.findOne({ roomID: value.roomid });
          if (!room) {
            socket.close(1000, "Invalid RoomID");
            return;
          }
          //個人ルームかどうかを確認
          if (room.types === "friend" || room.types === "remotefriend") {
            socket.close(1000, "Invalid RoomID");
            return;
          }
          //ルームメンバーかどうかを確認
          const isRoomMember = room.users.find((user) => user.userid === session.userid);
          if (!isRoomMember) {
            socket.close(1000, "Invalid RoomID");
            return;
          }
          session.roomid = value.roomid;
          if (typeof room.types === "string") {
            session.roomType = room.types;
          }
          sessions.set(value.sessionid, session);
          //ルームに参加したことを通知
          pubClient.publish(value.roomid, JSON.stringify({ type: "join", userid: session.userid }));
          session.ws.send(JSON.stringify({ type: "joined", roomid: value.roomid }));
          UpdateLastActivityTime(value.sessionid);
          return;
        }
      };
      socket.onclose = () => {
        //
      };
      if (!socket) throw new Error("unreachable");
      return response;
    }
  },
};

// セッションの最後の活動時間を更新する関数
function UpdateLastActivityTime(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  sessions.set(sessionId, {
    ...session,
    lastActivityTime: new Date(),
  });
}
function invalidateOldSessions() {
  const now = Date.now();
  for (const [sessionId, obj] of sessions.entries()) {
    const EXPIRATION_TIME = (1 * 60) * 60 * 1000;
    // obj.lastActivityTimeをミリ秒単位の数値に変換
    const lastActivityTimeMs = obj.lastActivityTime.getTime();
    if (now - lastActivityTimeMs > EXPIRATION_TIME) {
      // セッションを無効にする
      sessions.delete(sessionId);
    }
  }
}
setInterval(invalidateOldSessions, 5 * 60 * 1000);
