//communityサーバーへ参加申請を送信する
// POST /api/v2/server/activity/join/request/community
// { host: string, body: string }
// bodyは秘密鍵で署名されたJSON
// body: { userid: string, communityid: string }
