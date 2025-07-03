import { wsClient } from "./utils/websocketClient.ts";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// --- Globals ---

const isTauri = "__TAURI_IPC__" in globalThis || "__TAURI__" in globalThis;
let firebaseTokenPromise: Promise<string | null> | null = null;

// --- Firebase (Push Notifications) ---

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

// --- Main Takos Object Creation ---

export function createTakos(identifier: string) {
  const requestHandlers = new Map<
    string,
    (payload: unknown) => unknown | Promise<unknown>
  >();

  // --- Event Handling ---

  const listeners = new Map<string, Set<(payload: unknown) => void>>();

  // Listen to events from the backend (via WebSocket)
  wsClient.addGlobalEventListener((ev) => {
    if (ev.type === "event") {
      const { eventName, payload } = ev as unknown as {
        eventName?: string;
        payload?: unknown;
      };
      if (eventName) {
        listeners.get(eventName)?.forEach((h) => h(payload));
      }
    }
  });

  // Listen to events from Deno runtimes in Tauri
  if (isTauri) {
    listen("deno-event", (event) => {
      const { identifier: eventIdentifier, eventName, payload } = event.payload as {
        identifier: string;
        eventName: string;
        payload: unknown;
      };
      // Only handle events for the correct extension instance
      if (eventIdentifier === identifier) {
        requestHandlers.get(eventName)?.(payload);
      }
    }).catch(console.error);
  }

  // --- Extension API ---

  async function callServer(fn: string, args: unknown[] = [], options?: { push?: boolean; token?: string }) {
      if (options?.push && !options.token) {
        const token = await getFirebaseToken();
        if (token) {
          options = { ...options, token };
        }
      }
      const raw = await wsClient.call("extensions:invoke", {
        id: identifier,
        fn,
        args,
        options,
      });
      return raw;
  }

  async function callClient(fnName: string, args: unknown[] = []) {
      if (!isTauri) {
          console.warn("Client-side extensions are only supported in Tauri environment.");
          return;
      }
      return await invoke("invoke_extension_client", { identifier, fnName, args });
  }

  const events = {
    request: async (
      name: string,
      payload: unknown,
      options?: { push?: boolean; token?: string },
    ) => {
      // Events are primarily handled by the server-side extension
      return await callServer(name, [payload], options);
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
    call: callServer,
  };
  
  const client = {
      call: callClient
  }

  const extensions = {
    get(id: string) {
      return {
        identifier: id,
        async request(name: string, payload?: unknown) {
            // Prioritize server-side call, as it's the primary extension point
            try {
                return await wsClient.call("extensions:invoke", { id, fn: name, args: [payload] });
            } catch(err) {
                console.warn(`Server request to ${id} failed, trying client.`, err)
                // Fallback to client-side if server fails
                if (isTauri) {
                    return await invoke("invoke_extension_client", { identifier: id, fnName: name, args: [payload] });
                }
                return Promise.reject("Not in Tauri environment");
            }
        },
      };
    },
  };

  // --- Browser/App APIs ---

  const fetchFn = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init);

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

  function changeURL(listener: (e: { url: string[] }) => void): () => void {
    const handler = () => listener({ url: getURL() });
    globalThis.addEventListener("hashchange", handler);
    return () => globalThis.removeEventListener("hashchange", handler);
  }

  // --- Assemble Takos Object ---

  return {
    events,
    server,
    client,
    fetch: fetchFn,
    extensions,
    getURL,
    pushURL,
    setURL,
    changeURL,
  } as const;
}
