import { Hono } from "hono";
import { Extension } from "./models/extension.ts";
import type { Env } from "./index.ts";

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
  const script = `<script>
    (function() {
      try {
        const extensionId = "${id}";
        

        const pending = new Map();
        let seq = 0;
        const requestHandlers = new Map();

        const worker = new Worker('/api/extensions/' + extensionId + '/client.js', { type: 'module' });

        function callWorker(type, name, payload) {
          return new Promise((resolve) => {
            const id = ++seq;
            pending.set(id, resolve);
            worker.postMessage({ id, type, name, payload });
          });
        }

        worker.onmessage = (ev) => {
          const { id, type, name, payload, result } = ev.data || {};
          if (id && pending.has(id)) {
            pending.get(id)(result);
            pending.delete(id);
          } else if (type === 'request' && name) {
            const handler = requestHandlers.get(name);
            Promise.resolve(handler?.(payload)).then((res) => {
              if (id) worker.postMessage({ id, result: res });
            });
          }
        };

        window.addEventListener('message', (ev) => {
          if (ev.data && ev.data.target === 'takos-worker') {
            worker.postMessage(ev.data.payload);
          }
        });

        window.takos = {
          extensions: {
            all: [{
              identifier: extensionId,
              version: '1.0.0',
              isActive: true,
              request: (name, payload) => callWorker('extension', name, payload),
            }],
            get: (extId) => extId === extensionId ? window.takos.extensions.all[0] : undefined,
            request: (name, payload) => callWorker('extension', name, payload),
            onRequest: (name, handler) => { requestHandlers.set(name, handler); },
          },
          events: {
            request: (name, payload) => callWorker('event', name, payload),
            onRequest: (name, handler) => { requestHandlers.set(name, handler); },
          },
          request: (name, payload) => callWorker('extension', name, payload),
          onRequest: (name, handler) => { requestHandlers.set(name, handler); },
        };

        console.log('Takos object initialized for extension:', extensionId);
        
      } catch(e) {
        console.error('Failed to initialize takos object:', e);
        // Fallback basic takos object
        window.takos = {
          extensions: {
            all: [],
            get: () => {
              console.error('Extension system not available');
              return undefined;
            },
            invoke: () => Promise.reject(new Error('Extension system not available'))
          },
          events: {
            publish: () => {
              console.error('Event system not available');
              return Promise.resolve();
            }
          }
        };
      }
      
    })();
    </script>`;
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
