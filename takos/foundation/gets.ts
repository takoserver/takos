import app from "../_factory.ts";
import User from "../models/users.ts";
import { Category, Channels, Group } from "../models/groups.ts";
import IdentityKey from "../models/identityKey.ts";
import Message from "../models/message.ts";
import RoomKey from "../models/roomKey.ts";
import serverKey from "../models/serverKeys.ts";
import { cors } from "hono/cors";
app.use(cors(
  {
    origin: "*",
  },
));

app.get("accountKey", async (c) => {
  const userName = c.req.query("userName");
  if (!userName) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({
    userName,
  });
  if (!userInfo) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    accountKey: userInfo.accountKey,
    signature: userInfo.accountKeySign,
  });
});

app.get("friend/description", async (c) => {
  const userName = c.req.query("userName");
  if (!userName) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({
    userName,
  });
  if (!userInfo) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    description: userInfo.description,
  });
});

app.get("friend/icon", async (c) => {
  const userName = c.req.query("userName");
  if (!userName) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({
    userName,
  });
  if (!userInfo) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    icon: userInfo.icon,
  });
});

app.get("friend/nickname", async (c) => {
  const userName = c.req.query("userName");
  if (!userName) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({
    userName,
  });
  if (!userInfo) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    nickName: userInfo.nickName,
  });
});

app.get("friend/info", async (c) => {
  const userName = c.req.query("userName");
  if (!userName) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({
    userName,
  });
  if (!userInfo) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    description: userInfo.description,
    icon: userInfo.icon,
    nickName: userInfo.nickName,
  });
});

app.get("group/description", async (c) => {
  const groupId = c.req.query("groupId");
  if (!groupId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const group = await Group.findOne({
    groupId,
    type: "private",
  });
  if (!group) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    description: group.groupDescription,
  });
});

app.get("group/icon", async (c) => {
  const groupId = c.req.query("groupId");
  if (!groupId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const group = await Group.findOne({
    groupId,
    type: "private",
  });
  if (!group) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    icon: group.groupIcon,
  });
});

app.get("group/name", async (c) => {
  const groupId = c.req.query("groupId");
  if (!groupId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const group = await Group.findOne({
    groupId,
    type: "private",
  });
  if (!group) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    groupName: group.groupName,
  });
});

app.get("group/info", async (c) => {
  const groupId = c.req.query("groupId");
  if (!groupId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const group = await Group.findOne({
    groupId,
    type: "private",
  });
  if (!group) {
    console.log(groupId);
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    description: group.groupDescription,
    icon: group.groupIcon,
    groupName: group.groupName,
  });
});

app.get("group/data", async (c) => {
  const groupId = c.req.query("groupId");
  if (!groupId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const group = await Group.findOne({
    groupId,
    type: "private",
  });
  if (!group) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const channels = await Channels.find({ groupId });
  const categories = await Category.find({ groupId });

  // channels と categories を1つの配列にまとめる
  const items = [...channels, ...categories] as Array<{ id: string; order: number }>;
  // order プロパティでソート
  const sortedItems = items.sort((a, b) => a.order - b.order);

  const orders = sortedItems.map((item) => {
    return {
      id: item.id,
      order: item.order,
    };
  });
  return c.json({ orders,      owner: group.owner,
    defaultChannelId: group.defaultChannelId, });
});

app.get("publicGroup/description", async (c) => {
  const groupId = c.req.query("groupId");
  if (!groupId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const group = await Group.findOne({
    groupId,
    type: "public",
  });
  if (!group) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    description: group.groupDescription,
  });
});

app.get("publicGroup/icon", async (c) => {
  const groupId = c.req.query("groupId");
  if (!groupId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const group = await Group.findOne({
    groupId,
    type: "public",
  });
  if (!group) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    icon: group.groupIcon,
  });
});

app.get("publicGroup/name", async (c) => {
  const groupId = c.req.query("groupId");
  if (!groupId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const group = await Group.findOne({
    groupId,
    type: "public",
  });
  if (!group) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    groupName: group.groupName,
  });
});

app.get("publicGroup/info", async (c) => {
  const groupId = c.req.query("groupId");
  if (!groupId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const group = await Group.findOne({
    groupId,
    type: "public",
  });
  if (!group) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    description: group.groupDescription,
    icon: group.groupIcon,
    groupName: group.groupName,
  });
});

app.get("identity", async (c) => {
  const userName = c.req.query("userName");
  const hash = c.req.query("hash");
  if (!userName || !hash) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({
    userName,
  });
  if (!userInfo) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const identity = await IdentityKey.findOne({
    userName,
    hash,
  });
  if (!identity) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    identityKey: identity.identityKey,
    signature: identity.sign,
  });
});

app.get("masterKey", async (c) => {
  const userName = c.req.query("userName");
  if (!userName) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({
    userName,
  });
  if (!userInfo) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    masterKey: userInfo.masterKey,
  });
});

app.get("message", async (c) => {
  const messageId = c.req.query("messageId");
  if (!messageId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const message = await Message.findOne({
    messageid: messageId,
  });
  if (!message) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    message: message.message,
    signature: message.sign,
    timestamp: message.timestamp,
    userName: message.userName,
  });
});

app.get("roomKey", async (c) => {
  const userId = c.req.query("userId");
  const roomId = c.req.query("roomId");
  const hash = c.req.query("hash");
  const requesterId = c.req.query("requesterId");
  if (!userId || !roomId || !hash || !requesterId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({
    userName: userId.split("@")[0],
  });
  if (!userInfo) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const roomKey = await RoomKey.findOne({
    userName: userId.split("@")[0],
    roomId: {
      $in: [roomId, requesterId],
    },
    hash,
  });
  if (!roomKey) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const requestersKey = roomKey.encrtypedRoomKey.find((key) =>
    key[0] === requesterId
  );
  if (!requestersKey) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    roomKey: requestersKey[1],
  });
});

app.get("roomKeyMetaData", async (c) => {
  const userId = c.req.query("userId");
  const roomId = c.req.query("roomId");
  const hash = c.req.query("hash");
  if (!userId || !roomId || !hash) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({
    userId,
  });
  if (!userInfo) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const roomKey = await RoomKey.findOne({
    userId,
    roomId,
    hash,
  });
  if (!roomKey) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    metaData: roomKey.metaData,
    signature: roomKey.sign,
  });
});

app.get("serverKey", async (c) => {
  const expiry = c.req.query("expire");
  if (!expiry) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const serverKeyRes = await serverKey.findOne({
    expire: new Date(expiry),
  });
  if (!serverKeyRes) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    serverKey: serverKeyRes.public,
  });
});

export default app;
