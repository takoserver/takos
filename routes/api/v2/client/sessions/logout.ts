//sessionidを削除してcookieを削除する
// POST /api/v2/client/sessions/logout
// { csrftoken: string }
// -> { status: boolean, message: string }
import sessionID from "../../../../../models/sessionid.ts";
import takos from "../../../../../util/takos.ts";
export const handler = {
  async POST(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Already Logged Out" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const body = await req.json();
    if (await takos.checkCsrfToken(body.csrftoken, ctx.state.data.sessionid) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid CSRF token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    await sessionID.deleteOne({ sessionID: ctx.state.data.sessionID });
    //cookieを削除するheaderを返す
    return new Response(JSON.stringify({ status: true, message: "Logged Out" }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `sessionid=; path=/; max-age=0; httpOnly; SameSite=Strict;`,
      },
      status: 200,
    });
  },
};
