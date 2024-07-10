//websocket
export const handler = {
    GET(req: Request,ctx: any) {
        if (!ctx.state.data.loggedIn) {
            return new Response(JSON.stringify({ status: "Please Login" }), {
              headers: { "Content-Type": "application/json" },
              status: 401,
            })
        }
        if (req.headers.get("upgrade") === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(req)
            socket.onmessage = async function (event) {
                //
            }
            socket.onclose = () => {
                //
            }
            if (!socket) throw new Error("unreachable")
            return response
    }
}