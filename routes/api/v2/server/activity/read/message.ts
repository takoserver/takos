//メッセージを読んだことをサーバーに通知する
// POST /api/v2/server/activity/read/message
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { messageid: string, userid: string }
// -> { status: boolean, message: string }
