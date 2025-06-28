// Simple Takos API wrapper
// Provides minimal access helpers for extensions.

const api = (globalThis as { takos?: Record<string, unknown> }).takos ?? {};

export interface SimpleTakosAPI {
  events?: {
    request: (name: string, payload: unknown) => Promise<unknown> | void;
    onRequest: (
      name: string,
      handler: (payload: unknown) => unknown | Promise<unknown>,
    ) => void;
  };
  kv?: {
    read: (key: string) => Promise<unknown> | void;
    write: (key: string, value: unknown) => Promise<void> | void;
    list: () => Promise<string[]> | void;
  };
  fetch?: (url: string, init?: RequestInit) => Promise<Response> | void;
  ap?: unknown;
  cdn?: unknown;
  extensions?: unknown;

  request: (name: string, payload: unknown) => Promise<unknown> | void;
  onRequest: (
    name: string,
    handler: (payload: unknown) => unknown | Promise<unknown>,
  ) => void;
  kvRead: (key: string) => Promise<unknown> | void;
  kvWrite: (key: string, value: unknown) => Promise<void> | void;
  kvList: () => Promise<string[]> | void;
  fetchFromTakos: (url: string, init?: RequestInit) => Promise<Response> | void;
}


export function request(name: string, payload: unknown): Promise<unknown> | void {
  return api.events?.request?.(name, payload);
}

export function onRequest(
  name: string,
  handler: (payload: unknown) => unknown | Promise<unknown>,
): void {
  api.events?.onRequest?.(name, handler);
}

export function kvRead(key: string): Promise<unknown> | void {
  return api.kv?.read?.(key);
}

export function kvWrite(key: string, value: unknown): Promise<void> | void {
  return api.kv?.write?.(key, value);
}

export function kvList(): Promise<string[]> | void {
  return api.kv?.list?.();
}

export function fetchFromTakos(url: string, init?: RequestInit): Promise<Response> | void {
  return api.fetch?.(url, init);
}

export const simpleTakos: SimpleTakosAPI = {
  ...api,
  request,
  onRequest,
  kvRead,
  kvWrite,
  kvList,
  fetch: fetchFromTakos,
};

export default simpleTakos;
