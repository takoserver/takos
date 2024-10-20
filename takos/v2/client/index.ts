import { Hono } from "hono";
import { z } from "zod";
import { Singlend } from "@evex/singlend";
import { hc } from "hono/hono/client";
import { checkRecapcha } from "../../utils/checkRecapcha.ts";
import registers from "./register.ts";
const app = new Hono();
const singlend = new Singlend();
import env from "../../utils/env.ts";

//
singlend.mount(registers)

singlend.on(
  "getRecapchaV2",
  z.object({
  }),
  (_query, ok, error) => {
    return ok(env["RECAPCHA_V2_SITE_KEY"])
  },
)

singlend.on(
  "getRecapchaV3",
  z.object({
  }),
  (_query, ok, error) => {
    return ok(env["RECAPCHA_V3_SITE_KEY"],)
  },
)

app.post("/", singlend.handler());

export default app;
