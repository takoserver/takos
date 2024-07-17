import users from "../../../../../models/users.ts";
import takos from "../../../../../util/takos.ts";
import { getCookies } from "$std/http/cookie.ts";
export const handler = {
  async GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: false, message: "Not Logged In" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const userid = ctx.state.data.userid;
    const url = new URL(req.url);
    const reload = url.searchParams.get("reload");
    const user = await users.findOne({ uuid: userid });
    if (!user) {
      return new Response("Internal Server Error", { status: 500 });
    }
    if (reload == "false") {
      if (user.addFriendKey) {
        return new Response(JSON.stringify({ status: true, message: "Success", addFriendKey: user.addFriendKey }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        //create addFriendKey
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const newAddFreiendKey = Array.from(
          array,
          (byte) => byte.toString(32).padStart(2, "0"),
        ).join("");
        await users.updateOne({ uuid: userid }, { addFriendKey: newAddFreiendKey });
        return new Response(JSON.stringify({ status: true, message: "Success", addFriendKey: newAddFreiendKey }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else {
      const csrftoken = url.searchParams.get("csrftoken");
      const sessionid = getCookies(req.headers).sessionid;
      if (typeof csrftoken !== "string") {
        return;
      }
      if (!await takos.checkCsrfToken(csrftoken, sessionid)) {
        return new Response(JSON.stringify({ status: false, message: "Invalid CSRF Token" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const newAddFreiendKey = Array.from(
        array,
        (byte) => byte.toString(32).padStart(2, "0"),
      ).join("");
      await users.updateOne({ uuid: userid }, { addFriendKey: newAddFreiendKey });
      return new Response(JSON.stringify({ status: true, message: "Success", addFriendKey: newAddFreiendKey }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
  },
};
