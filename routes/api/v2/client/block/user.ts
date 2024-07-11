//ユーザーをブロックする
//POST: /api/v2/client/block/user
// { userid: string, csrftoken: string }
// -> { status: boolean, message: string }
import takos from "../../../../../util/takos.ts";
import { load } from "$std/dotenv/mod.ts";
import userConfig from "../../../../../models/userConfig.ts";
import users from "../../../../../models/users.ts";
import friends from "../../../../../models/friends.ts";
const env = await load();
export const handler = {
  async POST(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      });
    }
    const body = await req.json();
    const userid = body.userid;
    if (typeof userid !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid user ID" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const userName = takos.splitUserName(userid).userName;
    const userDomain = takos.splitUserName(userid).domain;
    if (await takos.checkCsrfToken(body.csrftoken) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid CSRF token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (userName === ctx.state.data.username) {
      return new Response(JSON.stringify({ status: false, message: "Cannot block yourself" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const user = await users.findOne({ username: userName });
    if (user === null) {
      return new Response(JSON.stringify({ status: false, message: "User not found" }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      });
    }
    await userConfig.updateOne({ userID: ctx.state.data.userid }, { $push: { blockedUsers: userid } });
    if (userDomain !== env["DOMAIN"]) {
      const privateKey = await takos.getPrivateKey();
      const signature = await takos.signData(JSON.stringify({ userid: ctx.state.data.userid, blockedUser: userid }), privateKey);
      const remoteServer = await fetch(`https://${userDomain}/api/v2/server/block/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userid: ctx.state.data.userid, blockedUser: userid, signature: new Uint8Array(signature) }),
      });
      if (remoteServer.status !== 200) {
        return new Response(JSON.stringify({ status: false, message: "Failed to block user on remote server" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
    }
    //useridとfriendidが入っているfriendroomを削除
    const roomtype = userDomain == env["DOMAIN"] ? "friend" : "remotefriend";
    //友達リストから削除
    await friends.updateOne({ userID: ctx.state.data.userid }, { $pull: { friends: { $in: [userid] } } });
    await userConfig.updateOne({ userID: ctx.state.data.userid, types: roomtype }, { $pull: { friendRooms: { $in: [userid] } } });
    return new Response(JSON.stringify({ status: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
