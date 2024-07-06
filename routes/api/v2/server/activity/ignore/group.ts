//グループの招待を無視する
// POST /api/v2/server/activity/ignore/group
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { groupid: string, userid: string }
// -> { status: boolean, message: string }