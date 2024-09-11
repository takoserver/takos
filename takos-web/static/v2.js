var verifyCallback = function (response) { //コールバック関数の定義
  //#warning の p 要素のテキストを空に
  document.getElementById("warning").textContent = ""
  //#send の button 要素の disabled 属性を解除
  document.getElementById("send").disabled = false
}
var expiredCallback = function () { //コールバック関数の定義
  //#warning の p 要素のテキストに文字列を設定
  document.getElementById("warning").textContent = "送信するにはチェックを・・・"
  //#send の button 要素に disabled 属性を設定
  document.getElementById("send").disabled = true
}
function onRecaptchaSuccess(token) { //コールバック関数の定義
  console.log(token) //トークンをコンソールに出力
}
