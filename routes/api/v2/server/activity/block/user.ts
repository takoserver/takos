//ユーザーをブロックしたことを通知する
// POST /api/v2/server/activity/block/user
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { userid: string, username: string }
