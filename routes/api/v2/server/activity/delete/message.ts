//メッセージを削除するapi
//POST /api/v2/server/activity/delete/message
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { messageid: string, userid: string }