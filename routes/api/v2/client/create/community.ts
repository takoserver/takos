//communityを作成する
// POST /api/v2/client/create/community
// { name: string, description: string, csrftoken: string, icon: file }
// -> { status: boolean, message: string }
export const handler = {
  async POST(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      });
    }
    const body = await req.json();
    const { name, description, csrftoken, icon } = body;
  },
};
