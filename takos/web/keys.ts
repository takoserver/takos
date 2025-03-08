import {
  generateDeviceKey,
  isValidIdentityKeyPublic,
  keyHash,
  verifyMasterKey,
} from "@takos/takos-encrypt-ink";
import shareAccountKey from "../models/crypto/shareAccountKey.ts";
import { authorizationMiddleware, MyEnv } from "../userInfo.ts";
import { Hono } from "hono";
const app = new Hono<MyEnv>();
app.use("*", authorizationMiddleware);
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Session from "../models/users/sessions.ts";
import IdentityKey from "../models/crypto/identityKey.ts";
import RoomKey from "../models/crypto/roomKey.ts";
import friends from "../models/users/friends.ts";
import { load } from "@std/dotenv";
import { Member } from "../models/groups/groups.ts";
import accountKeyData from "../models/crypto/accountKey.ts";
import shareSignKey from "../models/crypto/shareSignKey.ts";

const env = await load();

app.get("deviceKey", (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({ deviceKey: session.deviceKey });
});

app.post("deviceKey", async (c) => {
  const deviceKey = await generateDeviceKey();
  const session = c.get("session");
  if (!session) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  Session.updateOne({ sessionid: session.sessionid }, { deviceKey });
  return c.json({ deviceKey });
});

app.get("accountKey", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  const accountKeyHash = c.req.query("hash");
  if (!accountKeyHash) {
    return c.json({ message: "Unauthorized2" }, 401);
  }
  const sharedKey = await shareAccountKey.findOne({
    userName: user.userName,
    hash: accountKeyHash,
    sessionid: c.get("session").sessionid,
  });
  if (!sharedKey || !sharedKey.encryptedAccountKey) {
    console.log(user.userName, accountKeyHash, c.get("session").sessionid);
    return c.json({ message: "Unauthorized3" }, 401);
  }
  const accountKey = await accountKeyData.findOne({
    userName: user.userName,
    hash: accountKeyHash,
  });
  if (!accountKey) {
    return c.json({ message: "Unauthorized4" }, 401);
  }
  return c.json({
    accountKey: sharedKey.encryptedAccountKey,
    shareDataSign: accountKey.shareDataSign,
  });
});

app.post(
  "identityKey",
  zValidator(
    "json",
    z.object({
      identityKey: z.string(),
      identityKeySign: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const session = c.get("session");
    if (!user || !user.masterKey) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { identityKey, identityKeySign } = c.req.valid("json");
    if (!verifyMasterKey(user.masterKey, identityKeySign, identityKey)) {
      return c.json({ message: "Invalid identity key" }, 400);
    }
    const { sessionUuid } = JSON.parse(identityKey);
    if (!sessionUuid) {
      return c.json({ message: "Invalid identity key" }, 400);
    }
    if (session.sessionUUID !== sessionUuid) {
      return c.json({ message: "Invalid identity key" }, 400);
    }
    if (!isValidIdentityKeyPublic(identityKey)) {
      return c.json({ message: "Invalid identity key" }, 400);
    }
    await IdentityKey.updateOne({
      userName: user.userName,
      sessionid: session.sessionid,
    }, {
      updateTime: Date.now(),
    });
    await IdentityKey.create({
      userName: user.userName,
      hash: await keyHash(identityKey),
      identityKey: identityKey,
      sign: identityKeySign,
      sessionid: session.sessionid,
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "accountKey",
  zValidator(
    "json",
    z.object({
      accountKey: z.string(),
      accountKeySign: z.string(),
      encryptedAccountKeys: z.array(z.tuple([z.string(), z.string()])),
      shareDataSign: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user || !user.masterKey) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    const { accountKey, accountKeySign, encryptedAccountKeys } = c.req.valid(
      "json",
    );
    if (!verifyMasterKey(user.masterKey, accountKeySign, accountKey)) {
      return c.json({ message: "Invalid account key" }, 400);
    }
    const sessionUUIDs = encryptedAccountKeys.map(([sessionUUID]) =>
      sessionUUID
    );
    const serverSessionUUIDs = (await Session.find({ userName: user.userName }))
      .map((session) => [session.sessionUUID, session.sessionid]);
    if (
      sessionUUIDs.length !== encryptedAccountKeys.length ||
      !sessionUUIDs.every((sessionUUID) =>
        serverSessionUUIDs.some(([serverSessionUUID]) =>
          serverSessionUUID === sessionUUID
        )
      )
    ) {
      return c.json({ message: "Invalid session" }, 400);
    }
    const beforAccountKey = await accountKeyData.findOne({
      userName: user.userName,
    }).sort({ timestamp: -1 });
    if (
      beforAccountKey
    ) {
      await shareAccountKey.updateMany({
        userName: user.userName,
        hash: beforAccountKey.hash,
      }, { $set: { updateTime: new Date() } });
    }
    for (
      const [sessionUUID, encryptedAccountKeyValue] of encryptedAccountKeys
    ) {
      await shareAccountKey.create({
        userName: user.userName,
        hash: await keyHash(accountKey),
        encryptedAccountKey: encryptedAccountKeyValue,
        sessionid: serverSessionUUIDs.find(([serverSessionUUID]) =>
          serverSessionUUID === sessionUUID
        )?.[1] ?? null,
      });
    }
    console.log(accountKey);
    await accountKeyData.create({
      userName: user.userName,
      hash: await keyHash(accountKey),
      key: accountKey,
      sign: accountKeySign,
      shareDataSign: c.req.valid("json").shareDataSign,
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "shareSignKey",
  zValidator(
    "json",
    z.object({
      shareSignKey: z.string(),
      shareSignKeySign: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user || !user.masterKey) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { shareSignKey: shareSignKeyValue, shareSignKeySign } = c.req.valid(
      "json",
    );
    if (!verifyMasterKey(user.masterKey, shareSignKeySign, shareSignKeyValue)) {
      return c.json({ message: "Invalid share sign key" }, 400);
    }
    await shareSignKey.create({
      userName: user.userName,
      sessionid: c.get("session").sessionid,
      sign: shareSignKeySign,
      timestamp: Date.now(),
      hash: await keyHash(shareSignKeyValue),
      shareSignKey: shareSignKeyValue,
    });
    return c.json({ message: "success" });
  },
);

app.get("shareSignKey", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const hash = c.req.query("hash");
  const shareSignKeyValue = await shareSignKey.findOne({
    userName: user.userName,
    hash,
  });
  if (!shareSignKeyValue) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({
    shareSignKey: shareSignKeyValue.shareSignKey,
    sign: shareSignKeyValue.sign,
  });
});

//accountKeyを保存したことを通知するapi
app.post(
  "accountKey/notify",
  zValidator(
    "json",
    z.object({
      hash: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { hash } = c.req.valid("json");
    const accountKey = await shareAccountKey.findOne({
      userName: user.userName,
      hash,
      sessionid: c.get("session").sessionid,
    });
    if (!accountKey) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    await shareAccountKey.deleteOne({ userName: user.userName, hash });
    return c.json({ message: "success" });
  },
);

app.post(
  "roomKey",
  zValidator(
    "json",
    z.object({
      roomId: z.string(),
      encryptedRoomKeys: z.array(z.tuple([z.string(), z.string()])),
      hash: z.string(),
      metaData: z.string(),
      sign: z.string(),
      type: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const session = c.get("session");
    if (!session) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { roomId, encryptedRoomKeys, hash, metaData, sign, type } = c.req
      .valid("json");
    if (type === "friend") {
      if (await RoomKey.findOne({ hash })) {
        return c.json({ message: "Already exists" }, 400);
      }
      const match = roomId.match(/^m\{([^}]+)\}@(.+)$/);
      if (!match) {
        return c.json({ error: "Invalid roomId format" }, 400);
      }
      const friendUserName = match[1];
      const domainFromRoom = match[2];
      if (
        !await friends.findOne({
          userName: user.userName + "@" + env["domain"],
          friendId: friendUserName + "@" + domainFromRoom,
        })
      ) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      if (encryptedRoomKeys.length !== 2) {
        return c.json({ message: "Invalid room key" }, 400);
      }
      await RoomKey.create({
        userName: user.userName,
        roomId,
        hash,
        encrtypedRoomKey: encryptedRoomKeys,
        metaData,
        sign,
      });
    }
    if (type === "group") {
      const match = roomId.match(/^g\{([^}]+)\}@(.+)$/);
      if (!match) {
        return c.json({ error: "Invalid roomId format" }, 400);
      }
      const friendUserName = match[1];
      const domainFromRoom = match[2];
      if (await RoomKey.findOne({ hash })) {
        return c.json({ message: "Already exists" }, 400);
      }
      if (
        !await Member.findOne({
          groupId: friendUserName + "@" + domainFromRoom,
          userId: user.userName + "@" + env["domain"],
        })
      ) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      await RoomKey.create({
        userName: user.userName,
        roomId,
        hash,
        encrtypedRoomKey: encryptedRoomKeys,
        metaData,
        sign,
      });
      return c.json({ message: "success" });
    }
    return c.json({ message: "success" });
  },
);

export default app;
