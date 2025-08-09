// __DEFINES__ が未定義だとクライアントが読み込めないため
// 空オブジェクトを用意して環境変数参照を無効化する
globalThis.__DEFINES__ ??= {};
export const env = globalThis.__DEFINES__;
export default env;
