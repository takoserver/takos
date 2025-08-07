import { Hono } from "hono";
import {
  decodeBase64,
  encodeBase64,
} from "https://deno.land/std@0.224.0/encoding/base64.ts";
import Fasp from "../../models/takos/fasp.ts";
import authRequired from "../../utils/auth.ts";

const app = new Hono();
app.use("/admin/fasps", authRequired);
app.use("/admin/fasps/*", authRequired);

app.get("/admin/fasps", async (c) => {
  const fasps = await Fasp.find().lean();
  return c.json({ fasps });
});

app.post("/admin/fasps/:id/accept", async (c) => {
  const id = c.req.param("id");
  const fasp = await Fasp.findById(id);
  if (!fasp) return c.json({ error: "not found" }, 404);
  fasp.accepted = true;
  const pub = decodeBase64(fasp.faspPublicKey);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", pub));
  const fingerprint = encodeBase64(hash);
  await fasp.save();
  return c.json({ fingerprint });
});

app.delete("/admin/fasps/:id", async (c) => {
  const id = c.req.param("id");
  await Fasp.findByIdAndDelete(id);
  return c.json({ ok: true });
});

export default app;
