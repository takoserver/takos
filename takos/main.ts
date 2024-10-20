import { Hono } from "hono";
import v2 from "./v2/index.ts";
import { serveStatic } from "hono/serve-static";
import { hc } from "hono/client";
import { cors } from "hono/cors";
import mongoose from "mongoose";
import env from "./utils/env.ts";
const app = new Hono();
app.route("/takos/v2", v2).use(
  "/*",
  serveStatic({
    root: "./",
    getContent: async (path, c) => {
      try {
        const file = await Deno.readFile(`./html/${path}`);
        return new Response(file, {
          headers: {
            "Content-Type": "text/html",
          },
        });
      } catch (e) {
        return null;
      }
    },
  }),
);
app.use(
  "*",
  cors(
    {
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE"],
    },
  ),
);

mongoose.connect(env["MONGO_URI"]).then(() => {
  console.log("Connected to MongoDB");
  Deno.serve(app.fetch);
});
