import { Hono } from "hono";
import authRequired from "../../utils/auth.ts";
import Fasp from "../../models/takos/fasp.ts";
import {
  activateCapability,
  getProviderInfo,
  registerProvider,
} from "../../services/fasp.ts";
import { getDomain } from "../../utils/activitypub.ts";

async function publicKeyFingerprint(pubKey: string): Promise<string> {
  const data = new TextEncoder().encode(pubKey);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const app = new Hono();
app.use("/admin/*", authRequired);

app.post("/admin/fasps", async (c) => {
  const { baseUrl } = await c.req.json() as { baseUrl?: string };
  if (!baseUrl) return c.json({ error: "baseUrl required" }, 400);
  const domain = getDomain(c);
  const fasp = await registerProvider(baseUrl, domain);
  if (!fasp) return c.json({ error: "registration failed" }, 400);
  return c.json({ ok: true, id: fasp._id });
});

app.get("/admin/fasps", async (c) => {
  const fasps = await Fasp.find().lean();
  return c.json({ fasps });
});

app.get("/admin/fasps/provider_info", async (c) => {
  const info = await getProviderInfo();
  if (!info) return c.json({ error: "not found" }, 404);
  return c.json({ info });
});

app.post("/admin/fasps/:id/accept", async (c) => {
  const { id } = c.req.param();
  const fasp = await Fasp.findById(id);
  if (!fasp) return c.json({ error: "not found" }, 404);
  fasp.accepted = true;
  await fasp.save();
  const fingerprint = await publicKeyFingerprint(fasp.faspPublicKey);
  return c.json({ ok: true, fingerprint });
});

app.delete("/admin/fasps/:id", async (c) => {
  const { id } = c.req.param();
  const fasp = await Fasp.findById(id);
  if (!fasp) return c.json({ error: "not found" }, 404);
  fasp.accepted = false;
  await fasp.save();
  return c.json({ ok: true });
});

app.post(
  "/admin/fasps/capabilities/:id/:version/activation",
  async (c) => {
    const { id, version } = c.req.param();
    const ok = await activateCapability(id, version, true);
    return c.json({ ok });
  },
);

app.delete(
  "/admin/fasps/capabilities/:id/:version/activation",
  async (c) => {
    const { id, version } = c.req.param();
    const ok = await activateCapability(id, version, false);
    return c.json({ ok });
  },
);

export default app;
