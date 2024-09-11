export const createSessionid = () => {
  const sessionIDarray = new Uint8Array(64)
  const randomarray = crypto.getRandomValues(sessionIDarray)
  const sessionid = Array.from(
    randomarray,
    (byte) => byte.toString(32).padStart(2, "0"),
  ).join("")
  return sessionid
}
