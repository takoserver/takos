import * as imagescript from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import takos from "../../../../../../util/takos.ts";
import users from "../../../../../../models/users.ts";
export const handler = {
  async POST(req: Request, ctx: any) {
    if (!ctx.state.data.isSetUp) {
      return new Response(JSON.stringify({ status: "Not Logged In" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    let body;
    try {
      body = await req.formData();
    } catch (e) {
      console.log(e);
      return new Response(JSON.stringify({ status: false, message: "Invalid body" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const nickName = body.get("nickName");
    const age = Number(body.get("age"));
    const icon = body.get("icon") as File;
    const csrftoken = body.get("csrftoken");
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
    console.log(icon);
    if (typeof nickName !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid nickName" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (age < 0 || age > 120) {
      return new Response(JSON.stringify({ status: false, message: "Invalid age" }), {
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
    takos.checkNickName(nickName);
    takos.checkAge(age);
    await users.updateOne({ uuid: ctx.state.data.userid }, { $set: { nickName: nickName, age: age, isSetup: true } });
    return new Response(JSON.stringify({ status: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
