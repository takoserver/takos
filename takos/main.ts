import { Hono } from "hono";
import v2 from "./v2/index.ts";
import { serveStatic } from "hono/serve-static";
import { hc } from "hono/client";
import { cors } from "hono/cors";
import mongoose from "mongoose";
import env from "./utils/env.ts";
import serverList from "./models/serverList.ts";
import serverKey from "./models/serverKey.ts";
import { generateServerKey } from "@takos/takos-encrypt-ink";
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
mongoose.connect(env["MONGO_URI"]).then(() => {
  console.log("Connected to MongoDB");
  serverList.findOne(
    { serverDomain: env["DOMAIN"] },
  ).then((result) => {
    if (!result) {
      serverList.create({ serverDomain: env["DOMAIN"] });
    }
  });
  serverKey.findOne({}).sort({ _id: -1 }).then((result) => {
    let generateKey = false;
    if (!result) {
      generateKey = true;
    } else {
      const now = new Date();
      if(new Date(result.expire) < now) {
        generateKey = true;
      }
    }
    if(generateKey) {
      const Key = generateServerKey();
      serverKey.create({
        public: Key.public,
        private: Key.private,
      });
    }
  });
  Deno.serve(app.fetch);
});