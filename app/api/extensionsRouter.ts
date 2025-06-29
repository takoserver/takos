import { Hono } from "hono";
import { Extension } from "./models/extension.ts";
import type { Env } from "./index.ts";

const initScript = await Deno.readTextFile(new URL("./initExtension.js", import.meta.url));

const app = new Hono<{ Bindings: Env }>();

app.get("/api/extensions", async (c) => {
  const extensions = await Extension.find().select("identifier client");
  return c.json(
    extensions.map((e) => ({ identifier: e.identifier, client: e.client })),
  );
});

app.get("/api/extensions/:id/ui", async (c) => {
  const id = c.req.param("id");
  const ext = await Extension.findOne({ identifier: id });
  if (!ext || !ext.ui) return c.notFound();
  c.header("Content-Type", "text/html; charset=utf-8");
  const script = `<script>${initScript.replace("__EXTENSION_ID__", id)}</script>`;
  const html = ext.ui.includes("</head>")
    ? ext.ui.replace("</head>", script + "</head>")
    : script + ext.ui;
  return c.html(html);
});

app.get("/api/extensions/:id/client.js", async (c) => {
  const id = c.req.param("id");
  const ext = await Extension.findOne({ identifier: id });
  if (!ext || !ext.client) return c.notFound();
  c.header("Content-Type", "application/javascript; charset=utf-8");
  c.header("Cache-Control", "no-store");
  return c.body(ext.client);
});

app.get("/api/extensions/:id/manifest.json", async (c) => {
  const id = c.req.param("id");
  const ext = await Extension.findOne({ identifier: id });
  if (!ext || !ext.manifest) return c.notFound();
  c.header("Content-Type", "application/json; charset=utf-8");
  return c.json(ext.manifest);
});

export default app;
