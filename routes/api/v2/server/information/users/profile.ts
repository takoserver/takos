//ユーザーのプロフィールを取得
//POST /api/v2/server/information/users/profile
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { userid: string, friendid: string }
// -> { status: boolean, profile: { name: string, icon: string, description: string, birthday: string} }
