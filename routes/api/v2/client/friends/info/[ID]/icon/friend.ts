//友達のアイコンを取得
// GET /api/v2/client/friends/info/:id/icon/friend
// { uuid: string }
// -> { status: boolean, message: string, icon: any }
import users from "../../../../../../../../models/users.ts";
import takos from "../../../../../../../../util/takos.ts";
import { load } from "$std/dotenv/mod.ts";
const env = await load();
export const handler = {
    async GET(req: any, ctx: any) {
        if(!ctx.state.data.loggedIn) {
            return new Response(JSON.stringify({ status: "Please Login" }), {
                headers: { "Content-Type": "application/json" },
                status: 401,
            });
        }
        const userid = ctx.state.data.userid;
        const friendid = ctx.params.ID;
        if(!friendid) {
            return new Response(JSON.stringify({ status: false, message: "Friend ID is required" }));
        }
        if(takos.splitUserName(friendid).domain !== env["DOMAIN"]) {
            //
        } else {
            const friendData = await users.findOne({ userName: takos.splitUserName(friendid).userName });
            if(friendData === null) {
                return new Response(JSON.stringify({ status: false, message: "User not found" }));
            }
            try {
                const friendIcon = await Deno.readFile("./files/userIcons/" + takos.splitUserName(friendData.uuid).userName + ".jpeg");
                return new Response(friendIcon, {
                    headers: { "Content-Type": "application/jpeg" },
                });
            } catch (error) {
                console.log(error);
                return new Response(JSON.stringify({ status: false, message: "Icon not found" }));
            }
        }
    }
}