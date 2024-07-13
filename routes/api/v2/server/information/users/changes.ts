// POST /api/v2/server/information/users/changes
// { host: string, signature: string, body: string }
// body: ({ userid, changes: [{ userid: string, userName: string, nickName: string, description: string,]})
// -> { status: boolean, changes: [{ userid: string, userName: string, nickName: string, description: string}] }
import users from "../../../../../../models/users.ts";
import takos from "../../../../../../util/takos.ts";
import frined from "../../../../../../models/friends.ts";
export const handler = {
  async POST(req: any, ctx: any) {
    const body = await req.json();
    const host = body.host;
    const publickey = await fetch(`https://${host}/api/v2/server/pubkey`).then((res) => res.json()).then((data) => data.publickey);
    const verify = await takos.verifySignature(publickey, body.signature, body.body);
    if (!verify) {
      return ctx.json({ status: false });
    }
    const data = JSON.parse(body.body);
    // 配列の中身が何個あるかを取得
    const changes = data.changes.length;
    if (changes > 120) {
      return new Response(JSON.stringify({
        status: false,
        message: "Changes are too many",
      }));
    }
    let isChange = false;
    const result: any[] = [];
    data.changes.forEach(async (change: any) => {
      const userInfo = await users.findOne({ uuid: change.userid });
      if (userInfo === null) {
        return;
      }
      const userFriend = await frined.findOne({ user: change.userid });
      if (userFriend === null) {
        return;
      }
      //friendsの中にuseridがあるか確認
      const isFriend = userFriend.friends.find((friend: any) => friend.userid === data.userid);
        if (isFriend === undefined) {
            return;
        }
      const user: {
        userid: string;
        userName?: string;
        nickName?: string;
        description?: string;
      } = {
        userid: userInfo.uuid,
        userName: userInfo.userName,
        nickName: userInfo.nickName,
        description: userInfo.description,
      };
      if (change.userName !== undefined) {
        if (change.userName !== userInfo.userName) {
          user.userName = change.userName;
          isChange = true;
        } else {
          delete user.userName;
        }
      } else {
        //userオブジェクトからuserNameを削除
        delete user.userName;
      }
      if (change.nickName !== undefined) {
        if (change.nickName !== userInfo.nickName) {
          user.nickName = change.nickName;
          isChange = true;
        } else {
          delete user.nickName;
        }
      } else {
        //userオブジェクトからnickNameを削除
        delete user.nickName;
      }
      if (change.description !== undefined) {
        if (change.description !== userInfo.description) {
          user.description = change.description;
          isChange = true;
        } else {
          delete user.description;
        }
      } else {
        //userオブジェクトからdescriptionを削除
        delete user.description;
      }
      result.push(user);
    });
    if (isChange) {
      return new Response(JSON.stringify({
        status: true,
        changes: result,
      }));
    } else {
      return new Response(JSON.stringify({
        status: false,
      }));
    }
  },
};
