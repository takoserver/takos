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
singlend.mount(login);
singlend.mount(sessionsFunction);

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