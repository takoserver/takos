//メールアドレスによる仮登録
// POST /api/v2/client/sessions/registers/temp
// { email: string, recaptcha: string }
// -> { status: boolean, message: string, token: string }