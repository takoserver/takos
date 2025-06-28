// Simple Takos API wrapper
// Provides minimal access helpers for extensions.

const api = (globalThis as { takos?: any }).takos ?? {};


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

export default {
  request,
  onRequest,
  kvRead,
  kvWrite,
  kvList,
  fetch: fetchFromTakos,
};
