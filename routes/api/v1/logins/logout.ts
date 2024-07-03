import { getCookies } from "$std/http/cookie.ts"
import sessionID from "../../../../models/sessionid.ts"
import csrftoken from "../../../../models/csrftoken.ts"
export const handler = {
  async POST(req: { json: () => any; headers: Headers }, ctx: { state: { data: { loggedIn: any; sessionid: any } } }) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ "status": "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      })
    }
    try {
      const data = await req.json()
      const cookies = getCookies(req.headers)
      if (typeof data.csrftoken !== "string") {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        })
      }
      const csrfTokenRecord = await csrftoken.findOne({
        token: data.csrftoken,
        sessionID: cookies.sessionid,
      })
      if (
        !csrfTokenRecord ||
        csrfTokenRecord.sessionID !== cookies.sessionid
      ) {
        return new Response(JSON.stringify({ status: "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        })
      }
      await csrftoken.deleteOne({ token: data.csrftoken })
      const sessionid = ctx.state.data.sessionid
      if (data.reqirments !== "logout") {
        return new Response(JSON.stringify({ "status": "error" }), {
          headers: { "Content-Type": "application/json" },
          status: 403,
        })
      }
      const result = await sessionID.deleteOne({ sessionID: sessionid })
      if (result.acknowledged) {
        return new Response(JSON.stringify({ "status": true }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `sessionid=; Path=/; Max-Age=0;`,
          },
          status: 200,
        })
      } else {
        return new Response(JSON.stringify({ "status": false }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `sessionid=; Path=/; Max-Age=0;`,
          },
          status: 500,
        })
      }
    } catch (e) {
      console.error(e)
      return new Response(JSON.stringify({ "status": "error" }), {
        headers: { "Content-Type": "application/json" },
        status: 403,
      })
    }
  },
}
