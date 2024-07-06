//友達申請を申請
// POST: /api/v2/server/activity/request/friend
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { userid: string, friendid: string }