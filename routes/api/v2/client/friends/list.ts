//友達の情報のオブジェクトを配列で返す
//GET /api/v2/client/friends/list
// -> { status: boolean, message: string, friends: [{userName, nickName,latestMessage,latestMessageTime}] }
import users from "../../../../../models/users.ts";
import rooms from "../../../../../models/rooms.ts";
import messages from "../../../../../models/messages.ts";
import { load } from "$std/dotenv/mod.ts";
import takos from "../../../../../util/takos.ts";
import remoteFriends from "../../../../../models/remoteFriends.ts";
import pubClient from "../../../../../util/redisClient.ts";
const env = await load();
export const handler = {
  async GET(req: any, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return ctx.json({ status: false, message: "You are not logged in" });
    }
    const userid = ctx.state.data.userid;
    const roomsData = await rooms.find({ "users.userid": userid });
    const localFriendRooms = roomsData.filter((room: any) => room.types === "friend");
    const remoteFriendRooms = roomsData.filter((room: any) => room.types === "remotefriend");
    const groupRooms = roomsData.filter((room: any) => room.types === "group");
    const communities = roomsData.filter((room: any) => room.types === "community");
    //友達の情報を取得
    const localFriendData = Promise.all(localFriendRooms.map(async (room: any) => {
      const friend = room.users.find((user: any) => user.userid !== userid);
      const friendData = await users.findOne({ uuid: friend.userid });
      const latestMessage = await messages.findOne({ roomID: room.roomID }, { sort: { createdAt: -1 } });
      return {
        userName: friendData?.userName,
        nickName: friendData?.nickName,
        latestMessage: latestMessage?.message,
        latestMessageTime: latestMessage?.timestamp,
      };
    }));
    //リモート友達の情報を取得
    const remoteFriendData = Promise.all(remoteFriendRooms.map(async (room: any) => {
      const friend = room.users.find((user: any) => user.userid !== userid);
      const friendData = await remoteFriends.findOne({ uuid: friend.userid });
      const latestMessage = await messages.findOne({ roomID: room.roomID }, { sort: { createdAt: -1 } });
      return {
        userName: friendData?.userName,
        nickName: friendData?.nickName,
        latestMessage: latestMessage?.message,
        latestMessageTime: latestMessage?.timestamp,
      };
    }));
    //グループの情報を取得
    const groupData = Promise.all(groupRooms.map(async (room: any) => {
      const latestMessage = await messages.findOne({ roomID: room.roomID }, { sort: { createdAt: -1 } });
      return {
        roomName: room.showName,
        latestMessage: latestMessage?.message,
        roomID: room.uuid,
        latestMessageTime: latestMessage?.timestamp,
        roomIcon: room.roomIcon,
        type: room.types,
        isNewMessage: false,
      };
    }));
    //コミュニティの情報を取得
    const communityData = Promise.all(communities.map(async (room: any) => {
      const latestMessage = await messages.findOne({ roomID: room.roomID }, { sort: { createdAt: -1 } });
      return {
        roomName: room.showName,
        latestMessage: latestMessage?.message,
        roomID: room.uuid,
        latestMessageTime: latestMessage?.timestamp,
        roomIcon: room.roomIcon,
        type: room.types,
        isNewMessage: false,
      };
    }));
    //配列を結合
    const friendList = await Promise.all([await localFriendData, await remoteFriendData, await groupData, await communityData]);
    getRemoteFriendData(await remoteFriendData, ctx);
    return new Response(JSON.stringify({ status: true, friends: friendList.flat() }));
  },
};
async function getRemoteFriendData(room: Array<any>, ctx: any) {
  //([{userid:"tako@takos.jp",userName:"tako",nickName:"たこ"},{userid: "tako@takos2.jp",userName: "tako",nickName: "たこ"}]
  // ->{takos.jp: [{userid:"tako@takos.jp",userName:"tako",nickName:"たこ"}],
  //domain2: [{userid: "tako@takos2.jp",userName: "tako",nickName: "たこ"}]}
  const friendData = room.reduce((acc: any, friend: any) => {
    const domain = friend.userid.split("@")[1];
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(friend);
    return acc;
  }, {});
  let updatefriendData: any[] = [];
  for (const key in friendData) {
    const domain = key;
    const friendList = friendData[key];
    const body = JSON.stringify({ changes: friendList, userid: ctx.state.data.userid });
    const signature = await takos.signData(body, await takos.getPrivateKey());
    const res = await fetch(`https://${domain}/api/v2/server/information/users/changes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ host: domain, body, signature }),
    });
    const data = await res.json();
    if (!data.status) {
      continue;
    }
    updatefriendData = updatefriendData.concat(data.changes);
  }
  //配列が空でない場合、データベースに保存
  if (updatefriendData.length > 0) {
    const friendList = await remoteFriends.findOne({ user: ctx.state.data.userid });
    if (!friendList) {
      await remoteFriends.create({ user: ctx.state.data.userid, friends: updatefriendData });
    } else {
      await remoteFriends.updateOne({ user: ctx.state.data.userid }, { $set: { friends: updatefriendData } });
    }
    pubClient.publish(env["REDIS_CH"], JSON.stringify({ type: "listUpdate", userid: ctx.state.data.userid }));
  }
  //redisにpubする
  return;
}
