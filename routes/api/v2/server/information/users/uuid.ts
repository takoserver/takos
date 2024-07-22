//uuidとuserNameを変換する
import users from "../../../../../../models/users.ts";
import takos from "../../../../../../util/takos.ts";
export const handler = {
  async POST(req: any, ctx: any) {
    const body = await req.json();
    const host = body.host;
    const publickey = await fetch(`https://${host}/api/v2/server/pubkey`).then((res) => res.json()).then((data) => data.publickey);
    const verify = await takos.verifySignature(publickey, body.signature, body.body);
    if (!verify) {
      return new Response(JSON.stringify({
        status: false,
        message: "Invalid Signature",
      }));
    }
    const data = JSON.parse(body.body);
    const userName = data.userName;
    const userInfo = await users.findOne({ userName });
    if (userInfo === null) {
      return new Response(JSON.stringify({
        status: false,
        message: "User not found",
      }));
    }
    const result = JSON.stringify({
      status: true,
      userName: userInfo.uuid,
    });
    const signature = await takos.signData(result, await takos.getPrivateKey());
    return new Response(JSON.stringify({
      status: true,
      result,
      signature: new Uint8Array(signature),
    }));
  },
};
