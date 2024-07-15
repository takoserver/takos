//設定を変更するapi
//POST /api/v2/client/settings/privacy
// { setting: { ... }, csrftoken: string }
// -> { status: boolean, message: string }
import takos from "../../../../../util/takos.ts";
import userConfig from "../../../../../models/userConfig.ts";
export const handler = {
  async POST(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return ctx.json({ status: false, message: "You are not logged in" });
    }
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return ctx.json({ status: false, message: "Invalid JSON" });
    }
    const userid = ctx.state.data.userid;
    const setting = body.setting;
    const csrftoken = body.csrftoken;
    if (await takos.checkCsrfToken(csrftoken, ctx.state.data.sessionid) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid CSRF Token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (
      typeof setting !== "object" || setting === null || setting.addFriendById === undefined || setting.allowOtherServerUsers === undefined || typeof setting.addFriendById !== "boolean" ||
      typeof setting.allowOtherServerUsers !== "boolean"
    ) {
      return new Response(JSON.stringify({ status: false, message: "Invalid setting" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    await userConfig.updateOne({ userid: userid }, { addFriendById: setting.addFriendById, allowOtherServerUsers: setting.allowOtherServerUsers });
    return new Response(JSON.stringify({ status: true, message: "Success" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  },
};
