//ログインしてcookieをセットする
// POST /api/v2/client/sessions/login
// { email?: string, userName?: string, password: string}
// -> { status: boolean, message: string } cookie: sessionid=string; path=/; max-age=number; httpOnly; SameSite=Strict;
import users from "../../../../../models/users.ts"
import sessionID from "../../../../../models/sessionid.ts"
export const handler = {
  async POST(req: Request, ctx: any) {
    if (ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Already Logged In" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    }
    const body = await req.json()
    const { email, userName, password } = body
    if (typeof password !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid password" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    }
    if (typeof email !== "string" && typeof userName !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid email or userName" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    }
    //emailでログイン
    let user
    if (typeof email === "string") {
      user = await users.findOne({ email: email })
      if (user === null) {
        return new Response(JSON.stringify({ status: false, message: "User not found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        })
      }
    }
    //userNameでログイン
    if (typeof userName === "string") {
      user = await users.findOne({ userName: userName })
      if (user === null) {
        return new Response(JSON.stringify({ status: false, message: "User not found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        })
      }
    }
    if (user === null || user === undefined) {
      return new Response(JSON.stringify({ status: false, message: "User not found" }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      })
    }
    const salt = user.salt
    const hash = user.password
    const saltPassword = password + salt
    const reqHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(saltPassword),
    )
    const hashArray = new Uint8Array(reqHash)
    const hashHex = Array.from(
      hashArray,
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("")
    if (hash !== hashHex) {
      return new Response(
        JSON.stringify({ "status": false, error: "password" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 403,
        },
      )
    }
    const sessionIDarray = new Uint8Array(64)
    const randomarray = crypto.getRandomValues(sessionIDarray)
    const sessionid = Array.from(
      randomarray,
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("")
    const result = await sessionID.create({
      userid: user.uuid,
      sessionID: sessionid,
    })

    if (result !== null) {
      return new Response(JSON.stringify({ "status": true }), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `sessionid=${sessionid}; Path=/; Max-Age=2592000;`,
        },
        status: 200,
      })
    }
  },
}
