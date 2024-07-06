//communityサーバーへの参加申請を承認する
// POST /api/v2/server/activity/accept/community
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { userid: string, communityid: string }
// -> { status: boolean, message: string }
