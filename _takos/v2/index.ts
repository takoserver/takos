import { Hono } from "hono";
import client from "./client/index.ts";
import server from "./server/index.ts";

const app = new Hono();
app.route("/client", client);
app.route("/server", server);
export default app;
