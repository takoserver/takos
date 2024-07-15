//iconを変更
// POST /api/v2/client/settings/icon
// { icon: file, csrftoken: string }
// -> { status: boolean, message: string }
import * as imagescript from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import takos from "../../../../../util/takos.ts";
export const handler = {
  async POST(req: Request, ctx: any) {
    let body;
    try {
      body = await req.formData();
    } catch (e) {
      return new Response(JSON.stringify({ status: false, message: "Invalid body" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const icon = body.get("icon") as File;
    const csrftoken = body.get("csrftoken");
    if (icon === null || csrftoken === null) {
      return new Response(JSON.stringify({ status: false, message: "Invalid body" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (typeof csrftoken !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid csrf token" }), {
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
    if (icon === undefined || icon === null) {
      return new Response(JSON.stringify({ status: false, message: "Invalid icon" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (icon.size > 1048576) {
      return new Response(JSON.stringify({ status: false }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const image = await imagescript.Image.decode(
      await icon.arrayBuffer(),
    );
    const resized = image.resize(256, 256);
    //encode image to jpeg
    const encoded = await resized.encodeJPEG(100); // 100 is the quality of the JPEG image
    await Deno.writeFile(
      "./files/userIcons/" + takos.splitUserName(ctx.state.data.userid).userName +
        ".jpeg",
      encoded,
    );
    return new Response(JSON.stringify({ status: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
