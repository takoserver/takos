import { Hono } from "hono";
import { array, z } from "zod";
import { Singlend } from "@evex/singlend";
import registers from "./register.ts";
const app = new Hono();
const singlend = new Singlend();
import env from "../../utils/env.ts";
import { arrayBufferToBase64 } from "../../utils/buffers.ts";
import serverList from "../../models/serverList.ts";
import { cors } from "hono/cors";
import User from "../../models/users.ts";
import Session from "../../models/sessions.ts";
import { concatenateUint8Arrays } from "../../utils/connectBinary.ts";

app.use(
  "*",
  cors(
    {
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE"],
    },
  ),
);

singlend.mount(registers);

singlend.on(
  "getRecapchaV2",
  z.object({}),
  (_query, ok, _error) => {
    return ok({
      siteKey: env["RECAPCHA_V2_SITE_KEY"]
    });
  },
);

singlend.on(
  "getRecapchaV3",
  z.object({}),
  (_query, ok, _error) => {
    return ok({siteKey: env["RECAPCHA_V3_SITE_KEY"]});
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

singlend.on(
  "login",
  z.object({
    email: z.string(),
    userName: z.string(),
    password: z.string(),
  }),
  async (query, ok, error) => {
    if(!query.email && !query.userName) {
      return error({ error: "email or userName is required" });
    }
    if(!query.password) {
      return error({ error: "password is required" });
    }
    if(query.email) {
      const user = await User.findOne({ email: query.email });
      if(!user) {
        return error({ error: "user not found" });
      }
      const password = new TextEncoder().encode(query.password);
      const salt = new TextEncoder().encode(user.salt);
      const passwordHash = await crypto.subtle.digest(
        "SHA-256",
        concatenateUint8Arrays([salt, password]),
      );
      if(user.password === new TextDecoder().decode(new Uint8Array(passwordHash))) {
        const sessionid = crypto.getRandomValues(new Uint8Array(16));
        const hex = Array.from(sessionid).map((b) => b.toString(16).padStart(2, "0")).join("");
        await Session.create({ sessionid: hex, userName: user.userName });
        return ok({ sessionid: hex });
      }
      return error({ error: "password is incorrect" });
    } else {
      const user = await User.findOne({ userName: query.userName });
      if(!user) {
        return error({ error: "user not found" });
      }
      const password = new TextEncoder().encode(query.password);
      const salt = new TextEncoder().encode(user.salt);
      const passwordHash = await crypto.subtle.digest(
        "SHA-256",
        concatenateUint8Arrays([salt, password]),
      );
      if(user.password === new TextDecoder().decode(new Uint8Array(passwordHash))) {
        const sessionid = crypto.getRandomValues(new Uint8Array(16));
        const hex = Array.from(sessionid).map((b) => b.toString(16).padStart(2, "0")).join("");
        await Session.create({ sessionid: hex, userName: user.userName });
        return ok({ sessionid: hex });
      }
      return error({ error: "password is incorrect" });
    }
  },
);

app.post("/", singlend.handler());

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