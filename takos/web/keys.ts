import {
  generateDeviceKey,
  isValidIdentityKeyPublic,
  keyHash,
  verifyMasterKey,
} from "@takos/takos-encrypt-ink";
import shareAccountKey from "../models/shareAccountKey.ts";
import app from "../userInfo.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Session from "../models/sessions.ts";
import IdentityKey from "../models/identityKey.ts";
import RoomKey from "../models/roomKey.ts";
import friends from "../models/friends.ts";
import { load } from "@std/dotenv";

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
    return c.json({ message: "Unauthorized" }, 401);
  }
  const accountKeyHash = c.req.param("hash");
  if (!accountKeyHash) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const sharedKey = await shareAccountKey.findOne({
    userName: user.userName,
    hash: accountKeyHash,
    sessionid: c.get("session").sessionid,
  });
  if (!sharedKey || !sharedKey.encryptedAccountKey) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  return c.json({ accountKey: sharedKey.encryptedAccountKey });
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
      encryptedAccountKey: z.array(z.tuple([z.string(), z.string()])),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user || !user.masterKey) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { accountKey, accountKeySign, encryptedAccountKey } = c.req.valid(
      "json",
    );
    if (!verifyMasterKey(user.masterKey, accountKeySign, accountKey)) {
      return c.json({ message: "Invalid account key" }, 400);
    }
    const sessionUUIDs = encryptedAccountKey.map(([sessionUUID]) =>
      sessionUUID
    );
    const serverSessionUUIDs = (await Session.find({ userName: user.userName }))
      .map((session) => [session.sessionUUID, session.sessionid]);
    //sessionUUIDsに被りがなく、serverSessionUUIDsに全て含まれているか
    if (
      sessionUUIDs.length !== encryptedAccountKey.length ||
      !sessionUUIDs.every((sessionUUID) =>
        serverSessionUUIDs.some(([serverSessionUUID]) =>
          serverSessionUUID === sessionUUID
        )
      )
    ) {
      return c.json({ message: "Invalid session" }, 400);
    }
    await shareAccountKey.deleteMany({ userName: user.userName });
    for (const [sessionUUID, encryptedAccountKeyValue] of encryptedAccountKey) {
      await shareAccountKey.create({
        userName: user.userName,
        hash: await keyHash(accountKey),
        encryptedAccountKey: encryptedAccountKeyValue,
        sessionid: serverSessionUUIDs.find(([serverSessionUUID]) =>
          serverSessionUUID === sessionUUID
        )?.[1] ?? null,
      });
    }
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
      if (
        !await friends.findOne({
          userName: user.userName + "@" + env["domain"],
          friendId: roomId,
        })
      ) {
        console.log(user.userName + "@" + env["domain"], roomId);
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
    return c.json({ message: "success" });
  },
);

export default app;
