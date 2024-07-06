//画像メッセージを送信したことを受け取る
// POST /api/v2/server/activity/talk/image
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { messageid: string, userid: string, roomid: string }
