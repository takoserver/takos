//iconを取得
// GET /api/v2/client/users/icon
// -> icon: file
import takos from "../../../../../util/takos.ts";
export const handler = {
  async GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response("Not Logged In", { status: 401 });
    }
    const userid = ctx.state.data.userid;
    try {
      const icon = await Deno.readFile(`./files/userIcons/${takos.splitUserName(userid).userName}.jpeg`);
      return new Response(icon, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
    } catch (e) {
      console.log(e);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
