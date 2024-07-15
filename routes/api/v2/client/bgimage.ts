export const handler = {
  async GET(req: Request, ctx: any) {
    const userid = ctx.state.data.userid;
    try {
      // ./backgroundImages/にある画像すべてを取得
      const dirPath = "./backgroundImages";
      const result = await readRandomImageFromDir(dirPath).catch(console.error);
      return new Response(result, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
    } catch (e) {
      console.log(e);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

// ランダムに数値を生成する関数
function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// 指定されたディレクトリからランダムな画像ファイルを読み込む関数
async function readRandomImageFromDir(dir: string) {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif",".webp"];
  const files: string[] = [];
  for await (const dirEntry of Deno.readDir(dir)) {
    if (dirEntry.isFile && imageExtensions.some((ext) => dirEntry.name.toLowerCase().endsWith(ext))) {
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
  // 画像の内容はバイナリデータとして出力されるため、ここでは内容の表示は省略
  // 必要に応じて画像データを処理するコードを追加してください
}
