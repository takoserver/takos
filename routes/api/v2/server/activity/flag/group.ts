//グループを通報するapi
//POST /api/v2/server/activity/flag/group
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { groupid: string, userid: string, reason: string }
// -> { status: boolean, message: string }