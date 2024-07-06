//公開されたcommunityサーバーに参加する
// POST /api/v2/server/activity/join/community
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { communityid: string, userid: string }