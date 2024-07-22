import requestAddFriend from "../../../../../../models/reqestAddFriend.ts";
import users from "../../../../../../models/users.ts";
export const handler = {
  async GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: false, message: "Not Logged In" }));
    }
    const sessionid = ctx.state.data.sessionid;
    const userid = ctx.state.data.userid;
    const result = await requestAddFriend.findOne({ userid: userid });
    if (result === null) {
      return new Response(JSON.stringify({ status: true, message: "No friend request" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
    const friendData = await Promise.all(result.friendRequester.map(async (data: any) => {
      const friendData = await users.findOne({ uuid: data.userID });
      if(friendData === null) {
        return
      }
      return {
        userName: friendData.userName + "@" + data.domain,
        nickName: friendData.nickName,
      };
    }));
    return new Response(JSON.stringify({ status: true, result: friendData }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  },
};
