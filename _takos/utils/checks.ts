export const checkPassword = (password: string) => {
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,100}$/
  return passwordPattern.test(password)
}
export const checkUserName = (userName: string) => {
  const userNamePattern = /^[a-zA-Z0-9]{4,16}$/
  return userNamePattern.test(userName)
}
export const checkNickName = (nickName: string) => {
  // 1文字以上、16文字以下ひらがな、カタカナ、漢字、半角英数字、
  const nickNamePattern = /^[ぁ-んァ-ヶ一-龠a-zA-Z0-9]{1,16}$/
  return nickNamePattern.test(nickName)
}
