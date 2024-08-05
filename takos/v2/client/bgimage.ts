import { Hono } from "hono";
const app = new Hono();
app.get("/", async (c) => {
  try {
    // ./backgroundImages/にある画像すべてを取得
    const dirPath = "./backgroundImages";
    const result = await readRandomImageFromDir(dirPath).catch(console.error);
    if (!result) {
      return c.json({ error: "faild to load image" }, { status: 500 });
    }
    return c.body(result);
  } catch (e) {
    console.log(e);
    return c.json({ error: "faild to load image" }, { status: 500 });
  }
});

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
