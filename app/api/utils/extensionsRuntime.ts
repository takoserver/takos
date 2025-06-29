import { Extension } from "../models/extension.ts";
import { WebSocketManager } from "../websocketHandler.ts";
import { sendFCM } from "./fcm.ts";

const serviceAccountStr = Deno.env.get("SERVICE_ACCOUNT_JSON");
const serviceAccount = serviceAccountStr ? JSON.parse(serviceAccountStr) : null;

interface LoadedExtension {
  manifest: Record<string, unknown>;
  /** Raw server bundle source */
  serverCode?: string;
}

const extensions = new Map<string, LoadedExtension>();
const manifests = new Map<string, Record<string, unknown>>();

export async function initExtensions() {
  const docs = await Extension.find();
  for (const doc of docs) {
    try {
      await loadExtension(doc);
    } catch (err) {
      console.error(`Failed to load extension ${doc.identifier}:`, err);
    }
  }
}

export async function loadExtension(
  doc: {
    identifier: string;
    manifest: Record<string, unknown>;
    server?: string;
    client?: string;
    ui?: string;
    icon?: string;
  },
) {
  try {
    const wsManager = WebSocketManager.getInstance();
    let serverCode: string | undefined;

    if (doc.server) {
      serverCode = doc.server;
    }

    manifests.set(doc.identifier, doc.manifest);
    extensions.set(doc.identifier, {
      manifest: doc.manifest,
      serverCode,
    });

    // forward client events to connected clients only
    if (doc.client) {
      // minimal handler, expecting client to call globalThis.takos.events.publish
      const g = globalThis as typeof globalThis & {
        takos?: {
          clientPublish?: (
            name: string,
            payload: unknown,
            options?: { push?: boolean; token?: string },
          ) => Promise<unknown>;
        };
      };
      g.takos ??= {};
      g.takos.clientPublish = async (
        name: string,
        payload: unknown,
        options?: { push?: boolean; token?: string },
      ) => {
        wsManager.distributeEvent(name, payload);
        if (options?.push && options.token && serviceAccount) {
          await sendFCM(serviceAccount, options.token, {
            id: doc.identifier,
            fn: name,
            args: [payload],
          }).catch((err) => console.error("FCM error", err));
        }
        return undefined;
      };
    }
  } catch (err) {
    console.error(`Failed to initialize extension ${doc.identifier}:`, err);
  }
}

export function getExtension(id: string): LoadedExtension | undefined {
  return extensions.get(id);
}

export function getManifest(id: string): Record<string, unknown> | undefined {
  return manifests.get(id);
}

export async function callExtension(
  id: string,
  fnName: string,
  args: unknown[] = [],
): Promise<unknown> {
  const ext = extensions.get(id);
  if (!ext?.serverCode) throw new Error("extension not found");

  const modUrl = URL.createObjectURL(
    new Blob([ext.serverCode], { type: "text/javascript" }),
  );
  const workerCode = `let modPromise = import('${modUrl}');\n` +
    `self.onmessage = async (e) => {` +
    `  const { id, fn, args } = e.data;` +
    `  try {` +
    `    const mod = await modPromise;` +
    `    const result = await mod[fn](...args);` +
    `    self.postMessage({ id, result });` +
    `  } catch (err) {` +
    `    self.postMessage({ id, error: err?.message ?? String(err) });` +
    `  }` +
    `};`;

  const workerUrl = URL.createObjectURL(
    new Blob([workerCode], { type: "text/javascript" }),
  );

  const worker = new Worker(workerUrl, { type: "module" });

  return await new Promise((resolve, reject) => {
    const callId = crypto.randomUUID();
    function cleanup() {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      URL.revokeObjectURL(modUrl);
    }
    worker.onmessage = (ev) => {
      const data = ev.data;
      if (data && data.id === callId) {
        cleanup();
        if ("error" in data) reject(new Error(String(data.error)));
        else resolve(data.result);
      }
    };
    worker.onerror = (err) => {
      cleanup();
      reject(err);
    };
    worker.postMessage({ id: callId, fn: fnName, args });
  });
}

export async function runActivityPubHooks(
  context: string,
  object: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let result = object;
  const type = typeof result.type === "string" ? result.type : undefined;
  const typeName = type ? `on${type}` : undefined;

  for (const [id, ext] of extensions) {
    if (!ext.serverCode) continue;

    const handlers: string[] = [];
    if (typeName) handlers.push(typeName);
    handlers.push("onActivityPub");

    for (const h of handlers) {
      try {
        const res = await callExtension(id, h, [context, result]);
        if (res && typeof res === "object") {
          result = res as Record<string, unknown>;
        }
      } catch (err) {
        if (!(err instanceof Error && err.message.includes("function not found"))) {
          console.error(`ActivityPub event failed for ${id}:`, err);
        }
      }
    }
  }

  return result;
}
