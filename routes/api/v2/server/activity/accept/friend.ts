//友達リクエストを承認する
// POST /api/v2/server/activity/accept/friend
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { friendid: string, userid: string }
// -> { status: boolean, message: string }
