//メッセージを読んだことをサーバーに通知する
// POST /api/v2/client/talks/read
// { messageid: string, csrftoken: string, roomid: string, channel: string }
// -> { status: boolean, message: string }