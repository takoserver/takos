import { Hono } from "hono";
import { array, z } from "zod";
import { Singlend } from "@evex/singlend";
import registers from "./register.ts";
import login from "./login.ts";
import sessionsFunction from "./sessionFunction.ts";
const app = new Hono();
const singlend = new Singlend();
import env from "../../utils/env.ts";
import { arrayBufferToBase64 } from "../../utils/buffers.ts";
import { cors } from "hono/cors";
import ws from "./websocket/ws.ts";
import User from "../../models/users.ts";
import Key from "../../models/keys.ts";

singlend.mount(registers);

singlend.on(
  "getRecapchaV2",
  z.object({}),
  (_query, ok, _error) => {
    return ok({
      siteKey: env["RECAPCHA_V2_SITE_KEY"],
    });
  },
);

singlend.on(
  "getMasterKey",
  z.object({
    userName: z.string(),
  }),
  async (query, ok, error) => {
    const user = await User.findOne({ userName: query.userName });
    if (!user) {
      return error({ error: "user not found" });
    }
    return ok({ masterKey: user.masterKey });
  }
)
singlend.on(
  "getIdentiyKeyAndAccountKey",
  z.object({
    userName: z.string(),
    hash: z.string(),
  }),
  async (query, ok, error) => {
    const user = await User.findOne({ userName: query.userName });
    if (!user) {
      return error({ error: "user not found" });
    }
    const key = await Key.findOne({ userName: query.userName, keyHash: query.hash });
    if (!key) {
      return error({ error: "key not found" });
    }
    return ok({
      identityKey: key!.identityKey,
      accountKey: key!.accountKey,
      idenSign: key!.idenSign,
      accSign: key!.accSign,
    });
})
singlend.on(
  "getIdentiyKey",
  z.object({
    userName: z.string(),
    hash: z.string(),
  }),
  async (query, ok, error) => {
    const user = await User.findOne({ userName: query.userName });
    if (!user) {
      return error({ error: "user not found" });
    }
    const key = await Key.findOne({
      userName: query.userName,
      keyHash: query.hash,
    })
    if (!key) {
      return error({ error: "key not found" });
    }
    return ok({
      identityKey: key!.identityKey,
      idenSign: key!.idenSign
     });
  })
singlend.on(
  "getIdentityKeyAndAccountKeyLatest",
  z.object({
    userName: z.string(),
  }),
  async (query, ok, error) => {
    const user = await User.findOne({ userName: query.userName });
    if (!user) {
      return error({ error: "user not found" });
    }
    const key = await Key.findOne({
      userName: query.userName,
    }).sort({ timestamp: -1 });
    if (!key) {
      return error({ error: "key not found" });
    }
    return ok({
      identityKey: key!.identityKey,
      accountKey: key!.accountKey,
      idenSign: key!.idenSign,
      accSign: key!.accSign,
    });
  })
singlend.on(
  "getIdentityKeyLatest",
  z.object({
    userName: z.string(),
  }),
  async (query, ok, error) => {
    const user = await User.findOne({ userName: query.userName });
    if (!user) {
      return error({ error: "user not found" });
    }
    const key = await Key.findOne({
      userName: query.userName,
    }).sort({ timestamp: -1 });
    if (!key) {
      return error({ error: "key not found" });
    }
    return ok({
      identityKey: key!.identityKey,
      idenSign: key!.idenSign,
    });
})

singlend.on(
  "getRecapchaV3",
  z.object({}),
  (_query, ok, _error) => {
    return ok({ siteKey: env["RECAPCHA_V3_SITE_KEY"] });
  },
);

singlend.on(
  "getServerBackgroundImage",
  z.object({}),
  async (_query, ok, error) => {
    try {
      // ./backgroundImages/にある画像すべてを取得
      const dirPath = "./backgroundImages";
      const result = await readRandomImageFromDir(dirPath).catch(console.error);
      if (!result) {
        return error({ error: "faild to load image" });
      }
      return ok("data:image/jpg;base64," + arrayBufferToBase64(result));
    } catch (e) {
      console.log(e);
      return error({ error: "faild to load image" });
    }
  },
);

singlend.on(
  "getServerIconImage",
  z.object({}),
  async (_query, ok, error) => {
    try {
      const iconBinary = await Deno.readFile("./icon.jpg");
      return ok("data:image/jpg;base64," + arrayBufferToBase64(iconBinary));
    } catch (e) {
      console.log(e);
      return error({ error: "faild to load image" });
    }
  },
);

singlend.on(
  "getServerInfo",
  z.object({}),
  (_query, ok, _error) => {
    return ok({
      serverDescription: env["explain"],
    });
  },
);
singlend.mount(login);
singlend.mount(sessionsFunction);
app.use(
  "/",
  cors(
    {
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE"],
    },
  ),
);
app.post("/", singlend.handler());
app.route("/ws", ws);

export default app;

// ランダムに数値を生成する関数
function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// 指定されたディレクトリからランダムな画像ファイルを読み込む関数
async function readRandomImageFromDir(dir: string) {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const files: string[] = [];
  for await (const dirEntry of Deno.readDir(dir)) {
    if (
      dirEntry.isFile &&
      imageExtensions.some((ext) => dirEntry.name.toLowerCase().endsWith(ext))
    ) {
      files.push(dirEntry.name);
    }
  }
  if (files.length === 0) {
    throw new Error("ディレクトリに画像ファイルがありません。");
  }

  const randomIndex = getRandomInt(files.length);
  const randomFile = `${dir}/${files[randomIndex]}`;
  const imageData = await Deno.readFile(randomFile);
  return imageData;
}
