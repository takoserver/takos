//communityを通報する
// POST /api/v2/server/activity/flag/community
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { communityid: string, userid: string, reason: string }