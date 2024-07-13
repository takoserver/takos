import requestAddFriend from "../../../../../../models/reqestAddFriend.ts"
export const handler = {
    async GET(req: Request, ctx: any) {
        if (!ctx.state.data.loggedIn) {
        return ctx.json({ status: false, message: "You are not logged in" });
        }
        const sessionid = ctx.state.data.sessionid;
        const userid = ctx.state.data.userid;
        const result = await requestAddFriend.findOne({ userid: userid });
        if(result === null) {
            return new Response(JSON.stringify({ status: false, message: "No friend request" }), {
                headers: { "Content-Type": "application/json" },
                status: 200,
            });
        }
        const friendData = Promise.all(result.friendRequester.map(async (data: any) => {
            return {
                userName: data.userName + "@" + data.domain,
                nickName: data.nickName,
            }
        }));
        return new Response(JSON.stringify({ status: true, friendData }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    },
}