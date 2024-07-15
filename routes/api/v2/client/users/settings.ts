//現在の設定を取得
// GET /api/v2/client/users/settings
// -> { status: boolean, message: string, settings: Settings }
import users from "../../../../../models/users.ts";
import userConfig from "../../../../../models/userConfig.ts";
export const handler = {
    async GET(req: Request, ctx: any) {
        if (!ctx.state.data.loggedIn) {
        return ctx.json({ status: false, message: "You are not logged in" });
        }
        const userid = ctx.state.data.userid;
        const config = await userConfig.findOne({ userid: userid });
        if (!config) {
        await userConfig.create({ userid: userid, addFriendById: true, allowOtherServerUsers: true });
        }
        return new Response(JSON.stringify({ status: true, message: "Success", settings: {
        addFriendById: config?.addFriendById,
        allowOtherServerUsers: config?.allowOtherServerUsers,
        } }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
        });
    },
}