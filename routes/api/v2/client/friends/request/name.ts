import takos from "../../../../../../util/takos.ts";
import userConfig from "../../../../../../models/userConfig.ts";
import remoteFriends from "../../../../../../models/remoteFriends.ts";
import friends from "../../../../../../models/friends.ts";
import requestAddFriend from "../../../../../../models/reqestAddFriend.ts";
import { load } from "$std/dotenv/mod.ts";
import users from "../../../../../../models/users.ts";
const env = await load();
export const handler = {
  async GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: false, message: "Not Logged In" }));
    }
    const userid = ctx.state.data.userid;
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ status: false, message: "Invalid request" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const { userName, csrftoken } = body;
    if (typeof userName !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid userName" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (typeof csrftoken !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid csrftoken" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (takos.checkUserName(userName) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (await takos.checkCsrfToken(csrftoken, userid) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid CSRF token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const userDomain = takos.splitUserName(userName).domain;
    if (userDomain !== env["DOMAIN"]) {
      //friendのuuidを取得
      const response = await fetch(`https://${userDomain}/api/v2/server/information/users/uuid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ host: env["DOMAIN"], body: JSON.stringify({ userName }), signature: takos.signData(JSON.stringify({ userName }), await takos.getPrivateKey()) }),
      });
      const data = await response.json();
      if (data.status === false) {
        return new Response(JSON.stringify({ status: false, message: "User not found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        });
      }
      const friendId = data.userName;
      //すでにリクエストを送っているか確認
      const request = await requestAddFriend.findOne({ userid });
      if (request == null) {
        return new Response(JSON.stringify({ status: false, message: "Already requested" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
      const isAleredyRequested = request.requestedUser.find((user) => user.userID === friendId);
      if (isAleredyRequested) {
        return new Response(JSON.stringify({ status: false, message: "Already requested" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
      //すでに友達か確認
      const friendData = await friends.findOne({ user: userid });
      if (friendData == null) {
        return new Response(JSON.stringify({ status: false, message: "User not found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        });
      }
      const isFriend = friendData.friends.find((friend) => friend.userid === friendId);
      if (isFriend) {
        return new Response(JSON.stringify({ status: false, message: "Already friend" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
      //リクエストを送る
      const res = await fetch(`https://${userDomain}/api/v2/server/friends/request/friend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: env["DOMAIN"],
          body: JSON.stringify({ userid, friendid: friendId }),
          signature: takos.signData(JSON.stringify({ userid, friendid: friendId }), await takos.getPrivateKey()),
          }),
      });
      const resData = await res.json();
      if (resData.status === false) {
        return new Response(JSON.stringify({ status: false, message: "Failed to send request" }), {
          headers: { "Content-Type": "application/json" },
          status: 500,
        });
      }
      //リクエストを送信したことを記録
      await requestAddFriend.updateOne({ userid }, { $push: { requestedUser: { userID: friendId } } });
      return new Response(JSON.stringify({ status: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      const friendInfo = await users.findOne({ userName: takos.splitUserName(userName).userName });
      if (friendInfo === null) {
        return new Response(JSON.stringify({ status: false, message: "User not found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        });
      }
      const friendData = await friends.findOne({ user: userid });
      if (friendData == null) {
        return new Response(JSON.stringify({ status: false, message: "User not found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        });
      }
      const isFriend = friendData.friends.find((friend) => friend.userid === friendInfo.uuid);
      if (isFriend) {
        return new Response(JSON.stringify({ status: false, message: "Already friend" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
      if (friendData === null) {
        return new Response(JSON.stringify({ status: false, message: "User not found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        });
      }
      const isRequested = await requestAddFriend.findOne({ userid: friendInfo.uuid });
      if (isRequested == null) {
        return new Response(JSON.stringify({ status: false, message: "Already requested" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
      const isAleredyRequested = isRequested.friendRequester.find((user) => user.userID === userid);
      if (isAleredyRequested) {
        return new Response(JSON.stringify({ status: false, message: "Already requested" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
      //リクエストを送る
      await requestAddFriend.updateOne({ userid: friendInfo.uuid }, { $push: { friendRequester: { userID: userid } } });
      await requestAddFriend.updateOne({ userid }, { $push: { requestedUser: { userID: friendInfo.uuid } } });
      return new Response(JSON.stringify({ status: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
//{ host: string, body: string, signature: string }