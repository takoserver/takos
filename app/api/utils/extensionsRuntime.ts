import { Extension } from "../models/extension.ts";
import { WebSocketManager } from "../websocketHandler.ts";
import { sendFCM } from "./fcm.ts";

const serviceAccountStr = Deno.env.get("SERVICE_ACCOUNT_JSON");
const serviceAccount = serviceAccountStr ? JSON.parse(serviceAccountStr) : null;

interface LoadedExtension {
  manifest: Record<string, unknown>;
  server?: Record<string, unknown>;
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
    let serverExports: Record<string, unknown> | undefined;

    if (doc.server) {
      const url = URL.createObjectURL(
        new Blob([doc.server], { type: "text/javascript" }),
      );
      const mod = await import(url);
      serverExports = mod;
    }

    manifests.set(doc.identifier, doc.manifest);
    extensions.set(doc.identifier, {
      manifest: doc.manifest,
      server: serverExports,
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
  if (!ext?.server) throw new Error("extension not found");
  const fn = (ext.server as Record<string, unknown>)[fnName];
  if (typeof fn !== "function") {
    throw new Error(`function not found: ${fnName}`);
  }
  return await (fn as (...a: unknown[]) => unknown)(...args);
}

export async function runActivityPubHooks(
  context: string,
  object: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let result = object;
  for (const [id, ext] of extensions) {
    const manifest = manifests.get(id);
    const ap = manifest?.activityPub as
      | { objects: string[]; hook: string }
      | undefined;
    if (ap && ap.hook && Array.isArray(ap.objects) && ext.server) {
      const objType = result.type as string | undefined;
      if (objType && ap.objects.includes(objType)) {
        try {
          const fn = (ext.server as Record<string, unknown>)[ap.hook];
          if (typeof fn === "function") {
            const res =
              await (fn as (c: string, o: Record<string, unknown>) => unknown)(
                context,
                result,
              );
            if (res && typeof res === "object") {
              result = res as Record<string, unknown>;
            }
          }
        } catch (err) {
          console.error(`ActivityPub hook failed for ${id}:`, err);
        }
      }
    }
  }
  return result;
}
