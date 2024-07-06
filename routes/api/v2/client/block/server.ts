//サーバーをブロックする
//POST /api/v2/client/block/server
// { domain: string, csrftoken: string }
// -> { status: boolean, message: string }
import takos from "../../../../../util/takos.ts"
import userConfig from "../../../../../models/userConfig.ts"
export const handler = {
  async POST(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      })
    }
    const body = await req.json()
    const domain = body.domain
    if (await takos.checkCsrfToken(body.csrftoken) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid CSRF token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    }
    if (typeof domain !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid domain" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    }
    const config = await userConfig.findOne({ userID: ctx.state.data.userid })
    if (config === null) {
      return new Response(JSON.stringify({ status: false, message: "User not found" }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      })
    }
    if (config.blockServers.includes(domain)) {
      return new Response(JSON.stringify({ status: false, message: "Already blocked" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    }
    await userConfig.updateOne({ userID: ctx.state.data.userid }, { $push: { blockedServers: domain } })
    return new Response(JSON.stringify({ status: true, message: "Blocked" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  },
}
