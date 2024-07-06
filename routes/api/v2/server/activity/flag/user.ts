//ユーザーを通報
// POST /api/v2/server/activity/flag/user
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { userid: string, reason: string, messageid: string }