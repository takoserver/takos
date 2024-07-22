//フレンド申請を承認する
// POST /api/v2/client/friends/accept/friend
// { friendid: string}
// -> { status: boolean }
import friends from "../../../../../../models/friends.ts";
import requestAddFriend from "../../../../../../models/reqestAddFriend.ts";
import users from "../../../../../../models/users.ts";
import takos from "../../../../../../util/takos.ts";
export const handler = {
  async POST(req: any, ctx: any) {
    const body = await req.json();
    const friendid = body.friendid;
    const user = await users.findOne({ uuid: friendid });
    if (user === null) {
      return new Response(JSON.stringify({
        status: false,
        message: "User not found",
      }));
    }
    const request = await requestAddFriend.findOne({ user: user.uuid });
    if (request === null) {
      return new Response(JSON.stringify({
        status: false,
        message: "Request not found",
      }));
    }
    const isRequest = request.friendRequester.find((requester) => requester.userID === ctx.state.data.userid);
    if (isRequest === undefined) {
      return new Response(JSON.stringify({
        status: false,
        message: "Request not found",
      }));
    }
    await requestAddFriend.updateOne({ user: user.uuid }, { $pull: { friendRequester: { userID: ctx.state.data.userid } } });
    await requestAddFriend.updateOne({ user: ctx.state.data.userid }, { $pull: { requestedUser: { userID: user.uuid } } });
    await friends.updateOne({ user: ctx.state.data.userid }, { $push: { friends: { userid: user.uuid } } });
    await friends.updateOne({ user: user.uuid }, { $push: { friends: { userid: ctx.state.data.userid } } });
    return new Response(JSON.stringify({
      status: true,
    }));
  },
};