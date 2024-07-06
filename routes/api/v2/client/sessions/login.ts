//ログインしてcookieをセットする
// POST /api/v2/client/sessions/login
// { email?: string, userName?: string, password: string}
// -> { status: boolean, message: string } cookie: sessionid=string; path=/; max-age=number; httpOnly; SameSite=Strict;
