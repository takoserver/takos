//csrftokenを発行
// GET /api/v2/client/csrftoken
// -> { status: boolean, message: string, csrftoken: string }
import csrfToken from "../../../../models/csrftoken.ts";
import { getCookies } from "$std/http/cookie.ts";
import { load } from "$std/dotenv/mod.ts";
const env = await load();
export const handler = {
  async GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn && ctx.state.data.isSetUp === false) {
      return new Response(
        JSON.stringify({ status: false, message: "You are not logged in" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    const csrftoken = Array.from(
      array,
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const cookies = getCookies(req.headers);
    const sessionid = cookies.sessionid;
    const userid = ctx.state.data.userid;
    const origin = req.headers.get('origin')
    const origins = env["serverOrigin"].split(",")
    //localhostだとoriginがnullになるので
    /*
    if(origin === null){
      console.log(origins)
      console.log(origin)
      return new Response(
        JSON.stringify({ status: false, message: "Invalid origin" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (origins.includes(origin) === false) {
      return new Response(
        JSON.stringify({ status: false, message: "Invalid origin" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }*/
    await csrfToken.create({
      token: csrftoken,
      sessionID: sessionid,
      userid: userid,
    });
    return new Response(
      JSON.stringify({
        status: true,
        csrftoken: csrftoken,
      }),
      { status: 200, headers: { "Content-Type": "application/json",
        //cors
        "Access-Control-Allow-Origin": origin,
       } },
    );
  },
};
