export function splitUserName(
  userName: string,
): { userName: string; domain: string } {
  const splitUserName = userName.split("@")
  if (splitUserName.length === 1) {
    return { userName: splitUserName[0], domain: "" }
  }
  return { userName: splitUserName[0], domain: splitUserName[1] }
}
