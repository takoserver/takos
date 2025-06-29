import { wsClient } from "./utils/websocketClient.ts";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { invoke } from "@tauri-apps/api/core";

// Enhanced Tauri detection: check both __TAURI_IPC__ and __TAURI__ globals

let firebaseTokenPromise: Promise<string | null> | null = null;

async function getFirebaseToken(): Promise<string | null> {
  if (firebaseTokenPromise) return firebaseTokenPromise;
  firebaseTokenPromise = (async () => {
    try {
      const res = await fetch("/api/firebase-config");
      if (!res.ok) return null;
      const config = await res.json();
      const app = initializeApp(config);
      const messaging = getMessaging(app);
      return await getToken(messaging).catch(() => null);
    } catch {
      return null;
    }
  })();
  return await firebaseTokenPromise;
}

export function createTakos(identifier: string) {
  const isTauri = "__TAURI_IPC__" in globalThis || "__TAURI__" in globalThis;

  let worker: Worker | null = null;
  const pending = new Map<number, (value: unknown) => void>();
  const requestHandlers = new Map<
    string,
    (payload: unknown) => unknown | Promise<unknown>
  >();
  let seq = 0;

  if (!isTauri && typeof Worker !== "undefined") {
    worker = new Worker(`/api/extensions/${identifier}/client.js`, {
      type: "module",
    });

    worker.onmessage = (ev) => {
      const { id, type, name, payload, result } = ev.data || {};
      if (id && pending.has(id)) {
        pending.get(id)!(result);
        pending.delete(id);
      } else if (type === "request" && name) {
        const handler = requestHandlers.get(name);
        Promise.resolve(handler?.(payload)).then((res) => {
          if (id) worker!.postMessage({ id, result: res });
        });
      }
    };
  }

  function call(eventId: string, payload: unknown) {
    if (worker) {
      return new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        worker!.postMessage({ id, type: "extension", name: eventId, payload });
      });
    }
    return invoke("invoke_extension_event", {
      identifier: "takos",
      fnName: eventId,
      args: [payload],
    });
  }

  function unwrapResult(raw: unknown): unknown {
    let result: unknown = raw;
    while (result && typeof result === "object" && "result" in result) {
      result = (result as { result: unknown }).result;
    }
    if (
      result &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      "status" in result &&
      "body" in result
    ) {
      result = [
        (result as Record<string, unknown>)["status"],
        (result as Record<string, unknown>)["body"],
      ];
    } else if (
      !Array.isArray(result) &&
      result &&
      typeof result === "object" &&
      "0" in result &&
      "1" in result
    ) {
      result = [
        (result as Record<string, unknown>)["0"],
        (result as Record<string, unknown>)["1"],
      ];
    }
    return result;
  }

  const kv = (() => {
    return {
      read: async (key: string) => {
        const result = await invoke("kv_read", { identifier, key });
        return (result as { value: unknown }).value;
      },
      write: async (key: string, value: unknown) => {
        await invoke("kv_write", { identifier, key, value });
      },
      delete: async (key: string) => {
        await invoke("kv_delete", { identifier, key });
      },
      list: async (prefix?: string) => {
        const result = await invoke("kv_list", { identifier, prefix });
        return result as string[];
      },
    };
  })();

  const cdn = (() => {
    return {
      read: async (path: string) => {
        const result = await invoke("cdn_read", { identifier, path });
        return result as string;
      },
      write: async (
        path: string,
        data: string | Uint8Array,
        options?: { cacheTTL?: number },
      ) => {
        const result = await invoke("cdn_write", {
          identifier,
          path,
          data: typeof data === "string"
            ? data
            : btoa(String.fromCharCode(...data)),
          cacheTTL: options?.cacheTTL,
        });
        return result as string;
      },
      delete: async (path: string) => {
        await invoke("cdn_delete", { identifier, path });
      },
      list: async (prefix?: string) => {
        const result = await invoke("cdn_list", { identifier, prefix });
        return result as string[];
      },
    };
  })();

  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  wsClient.addGlobalEventListener((ev) => {
    if (ev.type === "event") {
      const { eventName, payload } = ev as unknown as {
        eventName?: string;
        payload?: unknown;
      };
      if (eventName) {
        const set = listeners.get(eventName);
        set?.forEach((h) => h(payload));
      }
    }
  });
  const events = {
    request: async (
      name: string,
      payload: unknown,
      options?: { push?: boolean; token?: string },
    ) => {
      if (options?.push && !options.token) {
        const token = await getFirebaseToken();
        if (token) {
          options = { ...options, token };
        }
      }

      // ローカルリスナーへの通知
      const handlers = listeners.get(name);
      handlers?.forEach((h) => {
        try {
          h(payload);
        } catch (_e) {
          /* ignore */
        }
      });

      try {
        const raw = await call("extensions:invoke", {
          id: identifier,
          fn: name,
          args: [payload],
          options,
        });
        return unwrapResult(raw);
      } catch (serverErr) {
        console.warn(
          `[Client] Server execution failed for ${name}:`,
          serverErr,
        );
        try {
          const raw = await invoke("invoke_extension_event", {
            identifier,
            fnName: name,
            args: [payload],
          });
          return unwrapResult(raw);
        } catch (err) {
          console.error(`[Client] Fallback execution failed for ${name}:`, err);
        }
        if (
          serverErr instanceof Error &&
          serverErr.message.includes("function not found")
        ) {
          return {
            success: false,
            error: `Function '${name}' not found in extension '${identifier}'`,
            timestamp: new Date().toISOString(),
          };
        }
        return {
          success: false,
          error: serverErr instanceof Error
            ? serverErr.message
            : String(serverErr),
          timestamp: new Date().toISOString(),
        };
      }
    },
    onRequest(
      name: string,
      handler: (payload: unknown) => unknown | Promise<unknown>,
    ) {
      requestHandlers.set(name, handler);
      return () => {
        requestHandlers.delete(name);
      };
    },
  };

  const server = {
    call: async (
      fn: string,
      args: unknown[] = [],
      options?: { push?: boolean; token?: string },
    ) => {
      const raw = await call("extensions:invoke", {
        id: identifier,
        fn,
        args,
        options,
      });
      return unwrapResult(raw);
    },
  };

  const fetchFn = (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, init);

  const extensionObj = {
    identifier,
    version: "",
    get isActive() {
      return true;
    },
    async request(name: string, payload?: unknown) {
      try {
        const raw = await call("extensions:invoke", {
          id: identifier,
          fn: name,
          args: [payload],
        });
        return unwrapResult(raw);
      } catch (err) {
        console.warn(
          `[Client] Server execution failed for ${name}:`,
          err,
        );
        try {
          const raw = await invoke("invoke_extension_event", {
            identifier,
            fnName: name,
            args: [payload],
          });
          return unwrapResult(raw);
        } catch (err2) {
          console.error(
            `[Client] Fallback execution failed for ${name}:`,
            err2,
          );
        }
        return undefined;
      }
    },
  };

  const extensions = {
    get(id: string) {
      return {
        identifier: id,
        async request(name: string, payload?: unknown) {
          try {
            const raw = await call("extensions:invoke", {
              id,
              fn: name,
              args: [payload],
            });
            return unwrapResult(raw);
          } catch (err) {
            console.warn(`[Client] extension request failed for ${id}:${name}:`, err);
            try {
              const raw = await invoke("invoke_extension_event", {
                identifier: id,
                fnName: name,
                args: [payload],
              });
              return unwrapResult(raw);
            } catch (err2) {
              console.error(`[Client] fallback extension request failed:`, err2);
              return undefined;
            }
          }
        },
      };
    },
    onRequest(
      name: string,
      handler: (payload: unknown) => unknown | Promise<unknown>,
    ) {
      requestHandlers.set(name, handler);
      return () => {
        requestHandlers.delete(name);
      };
    },
  };

  function getURL() {
    return location.hash.slice(1).split("/").filter((p) => p);
  }

  function setURL(segments: string[], _opts?: { showBar?: boolean }) {
    location.hash = "#" + segments.join("/");
  }

  function pushURL(segment: string, opts?: { showBar?: boolean }) {
    const segments = getURL();
    segments.push(segment);
    setURL(segments, opts);
  }

  function changeURL(
    listener: (e: { url: string[] }) => void,
  ): () => void {
    const handler = () => listener({ url: getURL() });
    globalThis.addEventListener("hashchange", handler);
    return () => globalThis.removeEventListener("hashchange", handler);
  }
  const takos = {
    kv,
    cdn,
    events,
    server,
    fetch: fetchFn,
    extensions,
    getURL,
    pushURL,
    setURL,
    changeURL,
  } as const;

  return takos;
}
