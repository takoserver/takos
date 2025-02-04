import app from "../_factory.ts";
import { array, isValid, z } from "zod";
import { isTrueRequestSchema } from "../utils/requestSchema.ts";
import tempUsers from "../models/tempUsers.ts";
import users from "../models/users.ts";
import { sendEmail } from "../utils/sendEmail.ts";
import { hashPassword, verifyPassword } from "../utils/password.ts";
import { zValidator } from "@hono/zod-validator";
import {
  generateDeviceKey,
  isValidAccountKeyPublic,
  isValidMasterKeyPublic,
  isValidShareKeyPublic,
  keyHash,
  verifyIdentityKey,
  verifyMasterKey,
} from "@takos/takos-encrypt-ink";
import Session from "../models/sessions.ts";
import IdentityKey from "../models/identityKey.ts";
import shareAccountKey from "../models/shareAccountKey.ts";
import { Image } from "imagescript";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "https://jsr.io/@takos/takos-encrypt-ink/5.3.2/utils/buffers.ts";
import { setCookie } from "hono/cookie";
import request from "../models/request.ts";
import { load } from "@std/dotenv";
import Friends from "../models/friends.ts";
import { Member } from "../models/groups.ts";
import Message from "../models/message.ts";

const env = await load();

app.post(
  "/register/temp",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
    }).strict(),
  ),
  async (c) => {
    const { email } = c.req.valid("json");
    if (await users.findOne({ email })) {
      return c.json({
        status: "error",
        message: "This email is already in use",
      }, 400);
    }
    const checkCode = generateRandom8DigitNumber();
    const token = crypto.randomUUID();
    if (await tempUsers.findOne({ email })) {
      await tempUsers.updateOne({
        email,
      }, {
        checkCode,
        token,
      });
    } else {
      await tempUsers.create({ email, checkCode, token });
    }
    sendEmail(
      email,
      "Takos Registration",
      `Your registration code is ${checkCode}`,
    );
    return c.json({ token });
  },
);

app.post(
  "/register/check",
  zValidator(
    "json",
    z.object({
      token: z.string(),
      checkCode: z.string(),
    }).strict(),
  ),
  async (c) => {
    const { token, checkCode } = c.req.valid("json");

    const tempUser = await tempUsers.findOne({ token, checkCode });

    if (!tempUser) {
      await tempUsers.updateOne({ token }, { $inc: { missCheck: 1 } });
      return c.json(
        { status: "error", message: "Invalid token or checkCode" },
        400,
      );
    }

    if (tempUser.missCheck >= 3) {
      return c.json({
        status: "error",
        message: "You have tried too many times",
      }, 400);
    }

    await tempUsers.updateOne({ token }, { checked: true });

    return c.json({ status: "success" });
  },
);

app.post(
  "/register",
  zValidator(
    "json",
    z.object({
      token: z.string(),
      password: z.string(),
      userName: z.string(),
    }).strict(),
  ),
  async (c) => {
    const { token, password, userName } = c.req.valid("json");

    const tempUser = await tempUsers.findOne({ token });

    if (!tempUser) {
      return c.json({ status: "error", message: "Invalid token" }, 400);
    }

    if (!tempUser.checked) {
      return c.json({
        status: "error",
        message: "You have not checked your email",
      }, 400);
    }

    if (await users.findOne({ userName })) {
      return c.json({
        status: "error",
        message: "This username is already in use",
      }, 400);
    }

    const [hash, salt] = await hashPassword(password);

    await users.create({
      email: tempUser.email,
      password: hash,
      salt,
      userName,
    });

    await tempUsers.deleteOne({ token });

    return c.json({ status: "success" });
  },
);

app.post(
  "/login",
  zValidator(
    "json",
    z.object({
      userName: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
      password: z.string().min(8).max(100),
      sessionUUID: z.string().regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        "Invalid UUID",
      ),
    }).strict(),
  ),
  async (c) => {
    const { userName, password, sessionUUID } = c.req.valid("json");
    const user = await users.findOne({ userName });
    if (!user) {
      return c.json({
        status: "error",
        message: "Invalid username or password",
      }, 400);
    }
    if (!await verifyPassword(password, user.password, user.salt)) {
      return c.json({
        status: "error",
        message: "Invalid username or password",
      }, 400);
    }
    const sessionid = generateSessionId();
    const deviceKey = await generateDeviceKey();
    await Session.create({
      userName: user.userName,
      sessionid: sessionid,
      deviceKey: deviceKey,
      sessionUUID: sessionUUID,
    });
    setCookie(c, "sessionid", sessionid, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 34560000,
    });
    return c.json({ sessionid: sessionid });
  },
);

app.post(
  "/logout",
  zValidator(
    "cookie",
    z.object({
      sessionid: z.string(),
    }),
  ),
  async (c) => {
    const sessionid = c.req.valid("cookie").sessionid;
    const session = await Session.findOne({ sessionid });
    if (!session) {
      return c.json({ status: "error", message: "Invalid session" }, 400);
    }
    await Session.deleteOne({ session });
    await shareAccountKey.deleteMany({ sessionid: session.sessionid });
    return c.json({ status: "success" });
  },
);

app.post(
  "/setUp",
  zValidator(
    "json",
    z.object({
      masterKey: z.string(),
      accountKey: z.string(),
      accountKeySign: z.string(),
      nickName: z.string().min(1).max(20),
      icon: z.string(),
      shareKey: z.string(),
      shareKeySign: z.string(),
    }).strict(),
  ),
  zValidator(
    "cookie",
    z.object({
      sessionid: z.string(),
    }),
  ),
  async (c) => {
    const {
      masterKey,
      accountKey,
      accountKeySign,
      nickName,
      icon,
      shareKey,
      shareKeySign,
    } = c.req.valid("json");
    const sessionid = c.req.valid("cookie").sessionid;
    const session = await Session.findOne({ sessionid });
    if (!session) {
      return c.json({ status: "error", message: "Invalid session" }, 400);
    }
    if (
      !isValidMasterKeyPublic(masterKey) ||
      !isValidAccountKeyPublic(accountKey) || !isValidShareKeyPublic(shareKey)
    ) {
      return c.json({ status: "error", message: "Invalid masterKey" }, 400);
    }
    if (!verifyMasterKey(masterKey, accountKeySign, accountKey)) {
      return c.json({ status: "error", message: "Invalid accountKey" }, 400);
    }
    if (!verifyMasterKey(masterKey, shareKeySign, shareKey)) {
      return c.json({ status: "error", message: "Invalid shareKey" }, 400);
    }
    await Session.updateOne({ sessionid }, {
      shareKey: shareKey,
      shareKeySign: shareKeySign,
      encrypted: true,
    });
    await users.updateOne({ userName: session.userName }, {
      nickName,
      icon: arrayBufferToBase64(
        await resizeImageTo256x256(new Uint8Array(base64ToArrayBuffer(icon))),
      ),
      setup: true,
      masterKey,
      accountKey,
      accountKeySign,
    });
    return c.json({ status: "success" });
  },
);

app.post(
  "/reset",
  zValidator(
    "json",
    z.object({
      masterKey: z.string(),
      accountKey: z.string(),
      accountKeySign: z.string(),
      shareKey: z.string(),
      shareKeySign: z.string(),
    }).strict(),
  ),
  zValidator(
    "cookie",
    z.object({
      sessionid: z.string(),
    }),
  ),
  async (c) => {
    const { masterKey, accountKey, accountKeySign, shareKey, shareKeySign } = c
      .req.valid("json");
    const sessionid = c.req.valid("cookie").sessionid;
    const session = await Session.findOne({ sessionid });
    if (!session) {
      return c.json({ status: "error", message: "Invalid session" }, 400);
    }
    if (
      !isValidMasterKeyPublic(masterKey) ||
      !isValidAccountKeyPublic(accountKey) || !isValidShareKeyPublic(shareKey)
    ) {
      return c.json({ status: "error", message: "Invalid masterKey" }, 400);
    }
    if (!verifyMasterKey(masterKey, accountKeySign, accountKey)) {
      return c.json({ status: "error", message: "Invalid accountKey" }, 400);
    }
    if (!verifyMasterKey(masterKey, shareKeySign, shareKey)) {
      return c.json({ status: "error", message: "Invalid shareKey" }, 400);
    }
    await shareAccountKey.deleteMany({ userName: session.userName });
    await Session.deleteMany({
      userName: session.userName,
      sessionid: { $ne: session.sessionid },
    });
    await Session.updateOne({ sessionid }, {
      shareKey: shareKey,
      shareKeySign: shareKeySign,
      encrypted: true,
    });
    await users.updateOne({ userName: session.userName }, {
      masterKey,
      accountKey,
      accountKeySign,
    });
    return c.json({ status: "success" });
  },
);

app.post(
  "/encrypt",
  zValidator(
    "json",
    z.object({
      identityKey: z.string(),
      identityKeySign: z.string(),
      shareKey: z.string(),
      shareKeySign: z.string(),
    }).strict(),
  ),
  zValidator(
    "cookie",
    z.object({
      sessionid: z.string(),
    }),
  ),
  async (c) => {
    const sessionid = c.req.valid("cookie").sessionid;
    const { identityKey, identityKeySign, shareKey, shareKeySign } = c.req
      .valid("json");
    const session = await Session.findOne({ sessionid });
    if (!session) {
      return c.json({ status: "error", message: "Invalid session" }, 400);
    }
    const userInfo = await users.findOne({ userName: session.userName });
    if (!userInfo || !userInfo.setup || !userInfo.masterKey) {
      return c.json({ status: "error", message: "Invalid session" }, 400);
    }
    if (!verifyMasterKey(userInfo.masterKey, identityKeySign, identityKey)) {
      return c.json({ status: "error", message: "Invalid identityKey" }, 400);
    }
    if (!verifyMasterKey(userInfo.masterKey, shareKeySign, shareKey)) {
      return c.json({ status: "error", message: "Invalid shareKey" }, 400);
    }
    const { sessionUuid } = JSON.parse(identityKey);
    if (session.sessionUUID !== sessionUuid) {
      return c.json({ status: "error", message: "Invalid sessionUUID" }, 400);
    }
    await Session.updateOne({ sessionid }, {
      shareKey: shareKey,
      shareKeySign: shareKeySign,
      encrypted: true,
    });
    await IdentityKey.create({
      userName: session.userName,
      hash: await keyHash(identityKey),
      identityKey: identityKey,
      sign: identityKeySign,
      masterKeyHash: await keyHash(userInfo.masterKey),
    });
    return c.json({ status: "success" });
  },
);

app.get(
  "/list",
  zValidator(
    "cookie",
    z.object({
      sessionid: z.string(),
    }),
  ),
  async (c) => {
    const sessionid = c.req.valid("cookie").sessionid;
    const session = await Session.findOne({ sessionid });
    if (!session) {
      return c.json({ status: "error", message: "Invalid session" }, 400);
    }
    const sessions = await Session.find({ userName: session.userName });
    const result = [];
    for (const s of sessions) {
      result.push({
        uuid: s.sessionUUID,
        encrypted: s.encrypted,
      });
    }
    return c.json(result);
  },
);

app.post(
  "/delete",
  zValidator(
    "json",
    z.object({
      sessionUUID: z.string().regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        "Invalid UUID",
      ),
    }).strict(),
  ),
  zValidator(
    "cookie",
    z.object({
      sessionid: z.string(),
    }),
  ),
  async (c) => {
    const sessionid = c.req.valid("cookie").sessionid;
    const session = await Session.findOne({ sessionid });
    if (!session) {
      return c.json({ status: "error", message: "Invalid session" }, 400);
    }
    const { sessionUUID } = c.req.valid("json");
    await Session.deleteOne({ userName: session.userName, sessionUUID });
    await shareAccountKey.deleteMany({ sessionid: session.sessionid });
    return c.json({ status: "success" });
  },
);

app.get(
  "/status",
  zValidator(
    "cookie",
    z.object({
      sessionid: z.string(),
    }),
  ),
  async (c) => {
    const sessionid = c.req.valid("cookie").sessionid;
    const session = await Session.findOne({ sessionid });
    if (!session) {
      return c.json({
        login: false,
        setup: false,
        deviceKey: null,
      });
    }
    const userInfo = await users.findOne({ userName: session.userName });
    if (!userInfo || !userInfo.setup || !userInfo.masterKey) {
      return c.json({
        login: true,
        setup: false,
        deviceKey: session.deviceKey,
      });
    }
    const requests = await request.find({
      receiver: userInfo.userName + "@" + env["domain"],
    }).sort({ timestamp: -1 }).limit(100);
    const friends = await Friends.find({
      userName: userInfo.userName + "@" + env["domain"],
    });
    const friendList = friends.map((f) => f.friendId);

    const groups = await Member.find({
      userId: userInfo.userName + "@" + env["domain"],
    });

    const groupList = groups.map((g) => g.groupId);
    const groupListSet = new Set(groupList);
    const groupListUnique = Array.from(groupListSet);

    const groupInfo = await Promise.all(groupListUnique.map(async (g) => {
      const latestMessage = await Message.findOne({
        roomId: g,
      }).sort({ timestamp: -1 });
      return [g, latestMessage];
    }));

    const friendInfo = await Promise.all(friendList.map(async (f) => {
      const latestMessage = await Message.findOne({
        roomId: f,
      }).sort({ timestamp: -1 });
      return [f, latestMessage];
    }));

    return c.json({
      login: true,
      setup: true,
      deviceKey: session.deviceKey,
      requests: requests.map((r) => ({
        id: r.id,
        type: r.type,
        sender: r.sender,
        query: r.query,
        timestamp: r.timestamp,
      })),
      friendInfo,
      groupInfo,
    });
  },
);

function generateRandom8DigitNumber() {
  // Web Crypto API を使用してランダムなバイトを生成
  const randomBytes = new Uint8Array(4); // 4バイトで十分な範囲
  crypto.getRandomValues(randomBytes);

  // 32ビットの整数を作成
  const randomNumber = new DataView(randomBytes.buffer).getUint32(0, false); // ビッグエンディアン

  // 8桁の数字に変換
  const eightDigitNumber = (randomNumber % 100000000).toString().padStart(
    8,
    "0",
  );
  return eightDigitNumber;
}

function generateSessionId() {
  const uuid = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(uuid).map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return hex;
}

export async function resizeImageTo256x256(
  imageBuffer: Uint8Array,
): Promise<Uint8Array> {
  // 画像を読み込む
  const image = await Image.decode(imageBuffer);

  // 画像をリサイズ
  const resizedImage = image.resize(256, 256);

  // バイナリとしてエンコード
  const outputBuffer = await resizedImage.encode();

  return outputBuffer;
}
export default app;
