// index.ts
import v2 from "./v2/index.ts";
import { Hono } from "hono";
import mongoose from "mongoose";
import { load } from "@std/dotenv";
const env = await load();
function start() {
  const port = env["PORT"];
  mongoose.connect(env["MONGO_URI"]);
  const app = new Hono().basePath("/takos");
  app.route("/v2", v2);
  Deno.serve({ port: Number(port) }, app.fetch);
}
export default start;
