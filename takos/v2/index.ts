import { Hono } from "hono";
import client from "./client/index.ts";

const app = new Hono();
app.route("/client", client);
export default app;
