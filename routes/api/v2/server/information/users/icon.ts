//アイコンを取得する
//POST /api/v2/server/information/users/icon
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { userid: string, friendid: string }
// -> { status: boolean, icon: file }