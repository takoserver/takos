// Lightweight runtime to execute extension client code inside a Web Worker

import type { createTakos } from "./takos.ts";

interface TakosGlobals {
  __takosEventDefs?: Record<string, Record<string, unknown>>;
  __takosClientEvents?: Record<string, Record<string, (p: unknown) => Promise<unknown>>>;
}

const WORKER_SOURCE = `
let takosCallId = 0;
const takosCallbacks = new Map();
function setPath(root, path, fn, transform) {
  let obj = root;
  for (let i = 0; i < path.length - 1; i++) {
    obj[path[i]] ??= {};
    obj = obj[path[i]];
  }
  obj[path[path.length - 1]] = (...args) => fn(transform, args);
}
function createTakos(paths) {
  const t = {};
  for (const p of paths) {
    setPath(
      t,
      p,
      (tr, args) => new Promise((resolve, reject) => {
        const id = ++takosCallId;
        takosCallbacks.set(id, { resolve, reject, transform: tr });
        self.postMessage({ type: 'takosCall', id, path: p, args });
      }),
      p[0] === 'fetch'
        ? (d) => new Response(d.body ? new Uint8Array(d.body) : undefined, { status: d.status, statusText: d.statusText, headers: d.headers })
        : null,
    );
  }
  return t;
}
let mod = null;
self.onmessage = async (e) => {
  const d = e.data;
  if (d.type === 'init') {
    globalThis.takos = createTakos(d.takosPaths);
    const url = URL.createObjectURL(new Blob([d.code], { type: 'application/javascript' }));
    mod = await import(url);
    self.postMessage({ type: 'ready' });
  } else if (d.type === 'call') {
    try {
      let target = mod;
      for (const part of d.fnName.split('.')) target = target?.[part];
      if (typeof target !== 'function') throw new Error('function not found: ' + d.fnName);
      const result = await target(...d.args);
      self.postMessage({ type: 'result', id: d.id, result });
    } catch (err) {
      self.postMessage({ type: 'error', id: d.id, error: err instanceof Error ? err.message : String(err) });
    }
  } else if (d.type === 'takosResult') {
    const cb = takosCallbacks.get(d.id);
    if (!cb) return;
    takosCallbacks.delete(d.id);
    const result = cb.transform ? cb.transform(d.result) : d.result;
    if ('error' in d) cb.reject(new Error(d.error));
    else cb.resolve(result);
  }
};
`;

const CLIENT_TAKOS_PATHS: string[][] = [
  ["fetch"],
  ["kv", "read"],
  ["kv", "write"],
  ["kv", "delete"],
  ["kv", "list"],
  ["events", "publish"],
];

class ExtensionWorker {
  #worker: Worker;
  #ready: Promise<void>;
  #pending = new Map<number, (v: unknown) => void>();
  #takos: ReturnType<typeof createTakos>;
  #callId = 0;
  constructor(code: string, takos: ReturnType<typeof createTakos>) {
    const url = URL.createObjectURL(
      new Blob([WORKER_SOURCE], { type: "application/javascript" }),
    );
    this.#worker = new Worker(url, { type: "module" });
    const revoke = () => URL.revokeObjectURL(url);
    this.#worker.addEventListener("message", revoke, { once: true });
    this.#takos = takos;
    this.#worker.onmessage = (e) => this.#onMessage(e);
    this.#worker.postMessage({
      type: "init",
      code,
      takosPaths: CLIENT_TAKOS_PATHS,
    });
    this.#ready = new Promise((res) => {
      const handler = (ev: MessageEvent) => {
        if (ev.data && ev.data.type === "ready") {
          this.#worker.removeEventListener("message", handler);
          res();
        }
      };
      this.#worker.addEventListener("message", handler);
    });
  }
  get ready(): Promise<void> {
    return this.#ready;
  }
  #onMessage(ev: MessageEvent) {
    const d = ev.data;
    if (d.type === "result" || d.type === "error") {
      const cb = this.#pending.get(d.id);
      if (!cb) return;
      this.#pending.delete(d.id);
      if (d.type === "error") cb(Promise.reject(new Error(d.error)));
      else cb(d.result);
    } else if (d.type === "takosCall") {
      this.#handleTakosCall(d);
    }
  }
  async #handleTakosCall(d: { id: number; path: string[]; args: unknown[] }) {
    let ctx: unknown = this.#takos;
    let target: unknown = this.#takos;
    for (const p of d.path) {
      ctx = target;
      target = (target as Record<string, unknown>)?.[p];
    }
    try {
      let result;
      if (typeof target === "function") {
        result = await (target as (...args: unknown[]) => unknown).apply(
          ctx as unknown,
          d.args,
        );
      } else result = target;
      if (d.path[0] === "fetch") {
        const arr = new Uint8Array(await (result as Response).arrayBuffer());
        const headersArr: [string, string][] = [];
        (result as Response).headers.forEach((v, k) => headersArr.push([k, v]));
        result = {
          status: (result as Response).status,
          statusText: (result as Response).statusText,
          headers: headersArr,
          body: arr,
        };
      }
      this.#worker.postMessage({ type: "takosResult", id: d.id, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.#worker.postMessage({ type: "takosResult", id: d.id, error: msg });
    }
  }
  async call(fn: string, args: unknown[] = []): Promise<unknown> {
    await this.#ready;
    return new Promise((res, rej) => {
      const id = ++this.#callId;
      this.#pending.set(
        id,
        (v) => (v instanceof Promise ? v.then(res, rej) : res(v)),
      );
      this.#worker.postMessage({ type: "call", id, fnName: fn, args });
    });
  }
  terminate() {
    this.#worker.terminate();
  }
}

const workers = new Map<string, ExtensionWorker>();
const loadingWorkers = new Map<string, Promise<ExtensionWorker>>();

async function fetchEventDefs(id: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`/api/extensions/${id}/manifest.json`);
    if (res.ok) {
      const manifest = await res.json();
      return (manifest?.eventDefinitions as Record<string, unknown>) || {};
    }
  } catch {
    // ignore
  }
  return {};
}

export function loadExtensionWorker(
  id: string,
  takos: ReturnType<typeof createTakos>,
): Promise<ExtensionWorker> {
  if (workers.has(id)) return workers.get(id)!;
  if (loadingWorkers.has(id)) return loadingWorkers.get(id)!;

  const promise = (async () => {
    const host = globalThis as TakosGlobals;
    host.__takosEventDefs = host.__takosEventDefs || {};
    let defs = host.__takosEventDefs[id];
    if (!defs) {
      defs = await fetchEventDefs(id);
      host.__takosEventDefs[id] = defs;
    }

    const res = await fetch(`/api/extensions/${id}/client.js`);
    const code = await res.text();
    const w = new ExtensionWorker(code, takos);
    await w.ready;
    workers.set(id, w);

    const events: Record<string, (payload: unknown) => Promise<unknown>> = {};
    for (const [ev, def] of Object.entries(defs)) {
      const handler = (def as { handler?: string }).handler;
      if (handler) {
        events[ev] = (payload: unknown) =>
          w.call(handler, [payload]) as Promise<unknown>;
      }
    }
    host.__takosClientEvents = host.__takosClientEvents || {};
    host.__takosClientEvents[id] = events;

    return w;
  })();

  loadingWorkers.set(id, promise);
  promise.finally(() => loadingWorkers.delete(id));
  return promise;
}

export function getExtensionWorker(id: string): ExtensionWorker | undefined {
  return workers.get(id);
}

export function terminateExtensionWorker(id: string): void {
  const w = workers.get(id);
  if (w) {
    w.terminate();
    workers.delete(id);
  }
}
