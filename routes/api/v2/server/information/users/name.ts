//uuidとuserNameを変換する
// POST /api/v2/server/information/users/uuid
// { host: string, body: string, signature: string }
// signatureは秘密鍵で署名されたJSON
// body: { uuid: string }
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
    const uuid = data.uuid;
    const userInfo = await users.findOne({ uuid });
    if (userInfo === null) {
      return new Response(JSON.stringify({
        status: false,
        message: "User not found",
      }));
    }
    const result = JSON.stringify({
      status: true,
      userName: userInfo.userName,
    });
    const signature = await takos.signData(result, await takos.getPrivateKey());
    return new Response(JSON.stringify({
      status: true,
      result,
      signature: new Uint8Array(signature),
    }));
  },
};
