//グループの参加を承認する
// POST /api/v2/server/activity/accept/group
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { groupid: string, userid: string }
// -> { status: boolean, message: string }
