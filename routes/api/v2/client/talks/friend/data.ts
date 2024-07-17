//GET /api/v2/client/talks/friend/data
// {friendid: string, limit: number, before: string, after: string}
// -> {status: boolean, message: string, data: Talk[]}
import messages from "../../../../../../models/messages.ts";
import friends from "../../../../../../models/friends.ts";
import users from "../../../../../../models/users.ts";
import takos from "../../../../../../util/takos.ts";
import remoteFriends from "../../../../../../models/remoteFriends.ts";
import { load } from "$std/dotenv/mod.ts";
const env = await load();
const usersCache = new Map();
export const handler = {
  async GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: false, message: "You are not logged in" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const url = new URL(req.url);
    const friendid = url.searchParams.get("friendid");
    const limit = url.searchParams.get("limit");
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");
    if (!friendid || !limit) {
      return new Response(JSON.stringify({ status: false, message: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (before && after) {
      return new Response(JSON.stringify({ status: false, message: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    //友達かどうか確認
    let roomid = "";
    const friendDomain = takos.splitUserName(friendid).domain;
    if (friendDomain !== env["DOMAIN"]) {
      const remoteFriend = await remoteFriends.findOne({ userName: takos.splitUserName(friendid).userName, host: friendDomain });
      if (!remoteFriend) {
        return new Response(JSON.stringify({ status: false, message: "Not friend" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      const userFriends = await friends.findOne({ user: ctx.state.data.userid });
      if (!userFriends) {
        return new Response(JSON.stringify({ status: false, message: "Not friend" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      if (
        !userFriends.friends.find((friend) => {
          if (friend.userid === remoteFriend.uuid) {
            roomid = friend.room as string;
          }
          return friend.userid === remoteFriend.uuid;
        })
      ) {
        return new Response(JSON.stringify({ status: false, message: "Not friend" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
    } else {
      const friendInfo = await users.findOne({ userName: takos.splitUserName(friendid).userName });
      if (!friendInfo) {
        return new Response(JSON.stringify({ status: false, message: "Not friend" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      const userFriends = await friends.findOne({ user: ctx.state.data.userid });
      if (!userFriends) {
        return new Response(JSON.stringify({ status: false, message: "Not friend" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      if (
        !userFriends.friends.find((friend) => {
          if (friend.userid === friendInfo.uuid) {
            roomid = friend.room as string;
          }
          return friend.userid === friendInfo.uuid;
        })
      ) {
        return new Response(JSON.stringify({ status: false, message: "Not friend" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
    }
    let messagesData: Array<any> = [];
    //データベースからメッセージを取得
    if (!before && !after) {
      messagesData = await messages.find({ roomid: roomid }).sort({ _id: -1 }).limit(parseInt(limit));
    } else if (before) {
      //そのメッセージの前のメッセージを取得
      messagesData = await messages.find({ roomid: roomid, messageid: { $lt: before } }).sort({ _id: -1 }).limit(parseInt(limit));
    } else if (after) {
      //そのメッセージの後のメッセージを取得
      messagesData = await messages.find({ roomid: roomid, messageid: { $gt: after } }).sort({ _id: -1 }).limit(parseInt(limit));
    }
    const result = await Promise.all(messagesData.map(async (message) => {
      const CacheUser = usersCache.get(message.userid);
      const read = await Promise.all(message.read.map(async (read: { userid: string; read: any }) => {
        const user = usersCache.get(read.userid);
        if (!user) {
          let userInfo;
          //= await users.findOne({ uuid: message.userid });
          if (takos.splitUserName(message.userid).domain !== env["DOMAIN"]) {
            const remoteFriend = await remoteFriends.findOne({ uuid: message.userid });
            userInfo = remoteFriend;
          } else {
            userInfo = await users.findOne({ uuid: message.userid });
          }
          usersCache.set(message.userid, userInfo);
          if (!userInfo) {
            return {
              userid: read.userid,
              userName: "Unknown",
              read: read.read,
            };
          }
          return userInfo.userName + "@" + takos.splitUserName(read.userid).domain;
        }
        return user.userName + "@" + takos.splitUserName(read.userid).domain;
      }));
      console.log(read);
      if (CacheUser) {
        if (message.messageType === "text") {
          return {
            messageid: message.messageid,
            userName: CacheUser.userName + "@" + takos.splitUserName(message.userid).domain,
            nickName: CacheUser.nickName,
            message: message.message,
            timestamp: message.timestamp,
            type: message.messageType,
            read: read,
          };
        }
      }
      let userInfo;
      //= await users.findOne({ uuid: message.userid });
      if (takos.splitUserName(message.userid).domain !== env["DOMAIN"]) {
        const remoteFriend = await remoteFriends.findOne({ uuid: message.userid });
        userInfo = remoteFriend;
      } else {
        userInfo = await users.findOne({ uuid: message.userid });
      }
      usersCache.set(message.userid, userInfo);
      if (!userInfo) {
        if (message.messageType === "text") {
          return {
            messageid: message.messageid,
            userName: "Unknown",
            message: message.message,
            timestamp: message.timestamp,
            type: message.messageType,
            read: message.read,
          };
        }
      }
      usersCache.set(message.userid, userInfo);
      if (message.messageType === "text") {
        return {
          messageid: message.messageid,
          userName: userInfo?.userName + "@" + takos.splitUserName(message.userid).domain,
          nickName: userInfo?.nickName,
          message: message.message,
          timestamp: message.timestamp,
          type: message.messageType,
          read: read,
        };
      }
    }));
    return new Response(JSON.stringify({ status: true, message: "Success", data: result }), { status: 200, headers: { "Content-Type": "application/json" } });
  },
};
