//nickNameを変更するapi
//POST /api/v2/client/settings/nickname
// { nickName: string, csrftoken: string }
// -> { status: boolean, message: string }
import takos from "../../../../../util/takos.ts";
import users from "../../../../../models/users.ts";
export const handler = {
  async POST(req: Request, ctx: any) {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ status: false, message: "Invalid body" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const nickName = body.nickName;
    const csrftoken = body.csrftoken;
    if (nickName === null || csrftoken === null) {
      return new Response(JSON.stringify({ status: false, message: "Invalid body" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (typeof nickName !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid nickName" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (await takos.checkCsrfToken(csrftoken, ctx.state.data.sessionid) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid csrf token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    //nickNameを変更
    await users.update({ nickName: nickName }, { id: ctx.state.data.userid });
    return new Response(JSON.stringify({ status: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  },
};
