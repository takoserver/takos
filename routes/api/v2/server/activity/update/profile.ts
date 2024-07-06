//プロフィールを変更したことを通知
// POST /api/v2/server/activity/update/profile
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { userid: string }
// -> { status: boolean, message: string }