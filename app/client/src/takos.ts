import { wsClient } from "./utils/websocketClient.ts";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { invoke } from "@tauri-apps/api/tauri";

const isTauri = typeof window !== "undefined" && "__TAURI_IPC__" in window;

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

interface TakosGlobals {
  __takosEventDefs?: Record<
    string,
    Record<string, { source?: string; handler?: string }>
  >;
}

async function fetchEventDefs(
  id: string,
): Promise<Record<string, { source?: string; handler?: string }>> {
  try {
    const res = await fetch(`/api/extensions/${id}/manifest.json`);
    if (res.ok) {
      const manifest = await res.json();
      return (
        manifest?.eventDefinitions as Record<string, { source?: string; handler?: string }>
      ) || {};
    }
  } catch {
    /* ignore */
  }
  return {};
}

async function getEventDefs(
  id: string,
): Promise<Record<string, { source?: string; handler?: string }>> {
  const host = globalThis as TakosGlobals;
  host.__takosEventDefs = host.__takosEventDefs || {};
  if (!host.__takosEventDefs[id]) {
    host.__takosEventDefs[id] = await fetchEventDefs(id);
  }
  return host.__takosEventDefs[id];
}

export function createTakos(identifier: string) {
  async function call(eventId: string, payload: unknown) {
    if (isTauri) {
      try {
        const result = await invoke("invoke_extension_event", {
          identifier: "takos",
          fnName: eventId,
          args: [payload],
        });
        return result;
      } catch (err) {
        throw new Error(
          `Tauri invoke failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      let res: Response;
      try {
        res = await fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: [{ identifier: "takos", eventId, payload }],
          }),
        });
      } catch (err) {
        throw new Error(
          `Request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      let data: unknown;
      try {
        data = await res.json();
      } catch (_err) {
        const text = await res.text();
        throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
      }
      const arr = Array.isArray(data)
        ? data as { success?: boolean; result?: unknown; error?: string }[]
        : [];
      const r = arr[0];
      if (r && r.success) return r.result;
      throw new Error(r?.error || "Event error");
    }
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
    if (isTauri) {
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
    } else {
      const localPrefix = `takos:${identifier}::`;
      const isBrowser = typeof indexedDB !== "undefined";

      let dbPromise: Promise<IDBDatabase> | undefined;
      function openDB() {
        if (!dbPromise) {
          dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open("takos-kv", 1);
            req.onupgradeneeded = () => {
              const db = req.result;
              if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
        }
        return dbPromise;
      }

      return isBrowser
        ? {
          read: async (key: string) => {
            const db = await openDB();
            return await new Promise<unknown>((resolve, reject) => {
              const tx = db.transaction("kv", "readonly");
              const store = tx.objectStore("kv");
              const req = store.get(localPrefix + key);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            });
          },
          write: async (key: string, value: unknown) => {
            const db = await openDB();
            await new Promise<void>((resolve, reject) => {
              const tx = db.transaction("kv", "readwrite");
              const store = tx.objectStore("kv");
              store.put(value, localPrefix + key);
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            });
          },
          delete: async (key: string) => {
            const db = await openDB();
            await new Promise<void>((resolve, reject) => {
              const tx = db.transaction("kv", "readwrite");
              const store = tx.objectStore("kv");
              store.delete(localPrefix + key);
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            });
          },
          list: async (prefix?: string) => {
            const db = await openDB();
            return await new Promise<string[]>((resolve, reject) => {
              const keys: string[] = [];
              const tx = db.transaction("kv", "readonly");
              const store = tx.objectStore("kv");
              const req = store.openCursor();
              req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                  const k = cursor.key as string;
                  if (k.startsWith(localPrefix)) {
                    const sub = k.slice(localPrefix.length);
                    if (!prefix || sub.startsWith(prefix)) keys.push(sub);
                  }
                  cursor.continue();
                } else {
                  resolve(keys);
                }
              };
              req.onerror = () => reject(req.error);
            });
          },
        }
        : {
          read: (key: string) =>
            call("kv:read", {
              id: identifier,
              key,
              side: "client",
            }),
          write: (key: string, value: unknown) =>
            call("kv:write", { id: identifier, key, value, side: "client" }),
          delete: (key: string) =>
            call("kv:delete", { id: identifier, key, side: "client" }),
          list: (prefix?: string) =>
            call("kv:list", { id: identifier, prefix, side: "client" }),
        };
    }
  })();

  const cdn = (() => {
    if (isTauri) {
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
            data: typeof data === "string" ? data : btoa(String.fromCharCode(...data)),
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
    } else {
      return {
        read: (path: string) => call("cdn:read", { id: identifier, path }),
        write: (
          path: string,
          data: string | Uint8Array,
          options?: { cacheTTL?: number },
        ) =>
          call("cdn:write", {
            id: identifier,
            path,
            data: typeof data === "string"
              ? data
              : btoa(String.fromCharCode(...data)),
            cacheTTL: options?.cacheTTL,
          }),
        delete: (path: string) => call("cdn:delete", { id: identifier, path }),
        list: (prefix?: string) => call("cdn:list", { id: identifier, prefix }),
      };
    }
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
    publish: async (
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

      const defs = await getEventDefs(identifier);
      const def = defs[name];

      const shouldUseServer = def?.source === "server" || !isTauri;

      if (!shouldUseServer) {
        try {
          const raw = await invoke("invoke_extension_event", {
            identifier,
            fnName: name,
            args: [payload],
          });
          return unwrapResult(raw);
        } catch (err) {
          console.warn(`[Client] Deno runtime failed for ${name}:`, err);
        }
      }

      try {
        const raw = await call("extensions:invoke", {
          id: identifier,
          fn: name,
          args: [payload],
          options,
        });
        return unwrapResult(raw);
      } catch (serverErr) {
        console.error(`[Client] Server execution failed for ${name}:`, serverErr);
        if (
          serverErr instanceof Error && serverErr.message.includes("function not found")
        ) {
          return {
            success: false,
            error: `Function '${name}' not found in extension '${identifier}'`,
            timestamp: new Date().toISOString()
          };
        }
        return {
          success: false,
          error: serverErr instanceof Error ? serverErr.message : String(serverErr),
          timestamp: new Date().toISOString()
        };
      }
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
    },    activate: () => ({
      publish: async (
        name: string,
        payload?: unknown,
        options?: { push?: boolean; token?: string },
      ) => {
        if (options?.push && !options.token) {
          const token = await getFirebaseToken();
          if (token) {
            options = { ...options, token };
          }
        }
        
        const defs = await getEventDefs(identifier);
        const def = defs[name];

        const useServer = def?.source === "server" || !isTauri;

        if (!useServer) {
          try {
            const raw = await invoke("invoke_extension_event", {
              identifier,
              fnName: name,
              args: [payload],
            });
            return unwrapResult(raw);
          } catch (err) {
            console.warn(`[Client] Deno runtime failed for ${name}:`, err);
          }
        }

        try {
          const raw = await call("extensions:invoke", {
            id: identifier,
            fn: name,
            args: [payload],
            options,
          });
          return unwrapResult(raw);
        } catch (serverErr) {
          console.error(`[Client] Server execution failed for ${name}:`, serverErr);
          if (
            serverErr instanceof Error && serverErr.message.includes("function not found")
          ) {
            return {
              success: false,
              error: `Function '${name}' not found in extension '${identifier}'`,
              timestamp: new Date().toISOString()
            };
          }
          return {
            success: false,
            error: serverErr instanceof Error ? serverErr.message : String(serverErr),
            timestamp: new Date().toISOString()
          };
        }

        return undefined;
      },
    }),
  };

  const extensions = {
    get(id: string) {
      return id === identifier ? extensionObj : undefined;
    },
    get all() {
      return [extensionObj];
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
    activateExtension: async (id: string) => {
      if (id === identifier) {
        return extensionObj.activate();
      }
      if (isTauri) {
        try {
          const raw = await invoke("activate_extension", { identifier: id });
          if (!raw) return undefined;

          return {
            publish: async (name: string, payload?: unknown, options?: { push?: boolean; token?: string }) => {
              const invokeRaw = await invoke("invoke_extension_event", {
                identifier: id,
                fnName: name,
                args: [payload],
              });
              return unwrapResult(invokeRaw);
            }
          };
        } catch (error) {
          console.error(`Failed to activate extension ${id} via Tauri:`, error);
          return undefined;
        }
      } else {
        // 他の拡張機能の場合は、server経由で取得を試みる
        try {
          const raw = await call("extensions:activate", { id });
          if (!raw) return undefined;

          return {
            publish: async (name: string, payload?: unknown, options?: { push?: boolean; token?: string }) => {
              const invokeRaw = await call("extensions:invoke", {
                id,
                fn: name,
                args: [payload],
                options,
              });
              return unwrapResult(invokeRaw);
            }
          };
        } catch (error) {
          console.error(`Failed to activate extension ${id}:`, error);
          return undefined;
        }
      }
    },
    getURL,
    pushURL,
    setURL,
    changeURL,
  } as const;


  if (isTauri) {
    console.log("Takos is running in Tauri environment.");
  } else {
    console.log("Takos is running in browser environment.");
  }

  return takos;
}
