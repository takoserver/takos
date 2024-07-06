//リクエストを無視したことを通知
// POST /api/v2/server/activity/ignore/friend
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { friendid: string, userid: string }
// -> { status: boolean, message: string }
