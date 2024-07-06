//トークデータを取得する
// GET /api/v2/server/information/talk/:id
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
//ある時間以前のトークデータを取得する
// body: { roomid: string, userid: string, limit: number, before: number }
