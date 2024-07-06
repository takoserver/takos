//グループチャットに友達を招待
// POST /api/v2/server/activity/invite/group
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { groupid: string, userid: string, friendid: string }