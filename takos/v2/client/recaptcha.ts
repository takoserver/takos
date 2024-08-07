import { load } from "@std/dotenv";
import { Hono } from "hono";
const env = await load();
const sitekeyv3 = env["recaptcha_site_key_v3"];
const sitekeyv2 = env["recaptcha_site_key_v2"];
const enableRecaptcha = env["recaptcha_enable"];

const app = new Hono();

app.get("/" , (c) => c.json({
    v2: sitekeyv2,
    v3: sitekeyv3,
    useing: enableRecaptcha
}));

export default app;