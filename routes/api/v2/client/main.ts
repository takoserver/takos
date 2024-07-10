//websocket
export const handler = {
    GET(req: Request,ctx: any) {
        if (!ctx.state.data.loggedIn) {
            return new Response(JSON.stringify({ status: "Please Login" }), {
              headers: { "Content-Type": "application/json" },
              status: 401,
            })
        }
        //
    }
}