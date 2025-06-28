// Simple Takos API wrapper
// Provides minimal access helpers for extensions.

// Access the global takos object if it exists. Use a loose type so that
// extensions can still run when the API is missing (e.g. during tests).
const api = (globalThis as { takos?: Partial<SimpleTakosAPI> }).takos ?? {} as
  Partial<SimpleTakosAPI>;

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
  ap?: {
    currentUser: () => Promise<string>;
    send: (activity: Record<string, unknown>) => Promise<void>;
    list: () => Promise<Record<string, unknown>[]>;
    actor: {
      read: () => Promise<Record<string, unknown>>;
      update: (key: string, value: unknown) => Promise<void>;
    };
    pluginActor: {
      create: (id: string, data: Record<string, unknown>) => Promise<string>;
      read: (id: string) => Promise<Record<string, unknown>>;
      list: () => Promise<Record<string, unknown>[]>;
    };
  };
  cdn?: {
    write: (path: string, data: string, options?: Record<string, unknown>) => Promise<string>;
    read: (path: string) => Promise<string>;
    list: (prefix?: string) => Promise<string[]>;
  };
  extensions?: {
    all: Array<{
      identifier: string;
      version: string;
      isActive: boolean;
    }>;
    get?: (id: string) => {
      identifier: string;
      version: string;
      isActive: boolean;
    } | undefined;
  };

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
  ...(api as Partial<SimpleTakosAPI>),
  request,
  onRequest,
  kvRead,
  kvWrite,
  kvList,
  fetchFromTakos,
};

export default simpleTakos;
