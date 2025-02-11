import app from "../_factory.ts";
import User from "../models/users.ts";
import { Group } from "../models/groups.ts";
import IdentityKey from "../models/identityKey.ts";
import Message from "../models/message.ts";
import RoomKey from "../models/roomKey.ts";
import serverKey from "../models/serverKeys.ts";
import { load } from "@std/dotenv";
const env = await load();
import { cors } from "hono/cors";
app.use(cors(
  {
    origin: "*",
  },
));

app.get("/version", (c) => {
  return c.json({ version: "0.2.0", name: "takos" });
});

app.get("message/:messageId", async (c) => {
  const messageId = c.req.param("messageId");
  const message = await Message.findOne({
    messageid: messageId,
  });
  if (!message) {
    return c.json({ error: "Invalid messageId" }, 400);
  }
  return c.json({
    message: message.message,
    signature: message.sign,
    timestamp: message.timestamp,
    userName: message.userName,
  });
});

app.get("/key/server/:origin", async (c) => {
  const origin = c.req.param("origin");
  const expire = c.req.query("expire");
  const server = await fetch(
    "https://" + origin + "/key/server?expire=" + expire,
  );
  const res = await server.json();
  return c.json({
    "key": res.key,
  });
});

app.get("/user/:key/:userId", async (c) => {
  const key = c.req.param("key");
  const userId = c.req.param("userId");
  if (!key || !userId) {
    return c.json({ error: "Invalid request" }, 400);
  }
  const userName = userId.split("@")[0];
  if (userId.split("@")[1] !== env["domain"]) {
    return c.json({ error: "Invalid userId" }, 400);
  }
  const user = await User.findOne({ userName });
  if (!user) {
    return c.json({ error: "Invalid userId" }, 400);
  }
  switch (key) {
    case "icon": {
      return c.json({ icon: user.icon });
    }
    case "nickName": {
      return c.json({ nickName: user.nickName });
    }
    case "description": {
      return c.json({ description: user.description });
    }
  }
  return c.json({ error: "Invalid request" }, 400);
});

app.get("/group/:key/:groupId", async (c) => {
  const key = c.req.param("key");
  const groupId = c.req.param("groupId");
  if (!key || !groupId) {
    return c.json({ error: "Invalid request" }, 400);
  }
  const group = await Group.findOne({ groupId });
  if (!group) {
    return c.json({ error: "Invalid groupId" }, 400);
  }
  switch (key) {
    case "icon": {
      return c.json({ icon: group.groupIcon });
    }
    case "name": {
      return c.json({ name: group.groupName });
    }
    case "description": {
      return c.json({ description: group.groupDescription });
    }
  }
  return c.json({ error: "Invalid request" }, 400);
});

app.get("/key/:kind", async (c) => {
  const kind = c.req.param("kind");
  if (!kind) {
    return c.json({ error: "Invalid request1" }, 400);
  }
  if (kind === "server") {
    const expire = c.req.query("expire");
    const server = await serverKey.create({ expire });
    return c.json({
      "key": server.public,
    });
  }
  const userId = c.req.query("userId");
  if (!userId) {
    return c.json({ error: "Invalid request2" }, 400);
  }
  if (userId.split("@")[1] !== env["domain"]) {
    return c.json({ error: "Invalid userId" }, 400);
  }
  const user = await User.findOne({ userName: userId.split("@")[0] });
  if (!user) {
    return c.json({ error: "Invalid userId" }, 400);
  }
  switch (kind) {
    case "masterKey": {
      return c.json({ key: user.masterKey });
    }
    case "accountKey": {
      return c.json({ key: user.accountKey, signature: user.accountKeySign });
    }
    case "identityKey": {
      const hash = c.req.query("hash");
      if (!hash) {
        return c.json({ error: "Invalid request3" }, 400);
      }
      const identityKey = await IdentityKey.findOne({
        hash,
        userName: user.userName,
      });
      if (!identityKey) {
        return c.json({ error: "Invalid hash" }, 400);
      }
      return c.json({ key: identityKey.identityKey });
    }
    case "roomKey": {
      const roomid = c.req.query("roomId");
      const targetUserId = c.req.query("targetUserId");
      const hash = c.req.query("hash");
      if (!targetUserId || !hash) {
        return c.json({ error: "Invalid request4" }, 400);
      }
      if (roomid) {
        const roomKey = await RoomKey.findOne({ roomId: roomid, hash });
        if (!roomKey) {
          return c.json({ error: "Invalid roomId" }, 400);
        }
        const requestersKey = roomKey.encrtypedRoomKey.find((key) =>
          key[0] === targetUserId
        );
        if (!requestersKey) {
          return c.json({ message: "Unauthorized" }, 401);
        }
        return c.json({
          roomKey: requestersKey[1],
        });
      } else {
        const roomKey = await RoomKey.findOne({ hash });
        if (!roomKey) {
          return c.json({ error: "Invalid roomId" }, 400);
        }
        const requestersKey = roomKey.encrtypedRoomKey.find((key) =>
          key[0] === targetUserId
        );
        if (!requestersKey) {
          return c.json({ message: "Unauthorized" }, 401);
        }
        return c.json({
          roomKey: requestersKey[1],
        });
      }
    }
  }
  return c.json({ error: "Invalid request5" }, 400);
});

app.get("/group/search", async (c) => {
  const query = c.req.param("query");
  const limit = Number(c.req.query("limit"));
  if (!query || !limit) {
    return c.json({ error: "Invalid request" }, 400);
  }
  if (limit > 100) {
    return c.json({ error: "Invalid limit" }, 400);
  }
  const groups = await Group.find({
    groupName: { $regex: query },
    groupDescription: { $regex: query },
    type: "public",
  }).limit(limit);
  if (!groups) {
    return c.json({ error: "No group found" }, 404);
  }
  return c.json({
    groups: groups.map((group) => {
      return group.groupId;
    }),
  });
});

app.get("/server/:item" , (c) => {
  const item = c.req.param("item");
  switch (item) {
    case "name": {
      return c.json({ name: env["name"] });
    }
    case "discription": {
      return c.json({ discription: env["discription"] });
    }
    case "icon": {
      return c.json({ icon: env["icon"] });
    }
  }
  return c.json({ error: "Invalid request" }, 400);
})

export default app;