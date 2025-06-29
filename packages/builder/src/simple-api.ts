// Simple Takos API wrapper
// Provides minimal access helpers for extensions.

// Access the global takos object if it exists. Use a loose type so that
// extensions can still run when the API is missing (e.g. during tests).
import type { Extension } from "./api-helpers.ts";
const api = (globalThis as { takos?: Partial<SimpleTakosAPI> }).takos ??
  {} as Partial<SimpleTakosAPI>;

export interface SimpleTakosAPI {
  events?: {
    request: (name: string, payload: unknown) => Promise<unknown> | void;
    onRequest: (
      name: string,
      handler: (payload: unknown) => unknown | Promise<unknown>,
    ) => () => void;
  };
  kv?: {
    read: (key: string) => Promise<unknown> | void;
    write: (key: string, value: unknown) => Promise<void> | void;
    delete: (key: string) => Promise<void> | void;
    list: (prefix?: string) => Promise<string[]> | void;
  };
  fetch?: (url: string, init?: RequestInit) => Promise<Response> | void;
  ap?: {
    currentUser: () => Promise<string>;
    send: (activity: Record<string, unknown>) => Promise<void>;
    read: (id: string) => Promise<Record<string, unknown>>;
    delete: (id: string) => Promise<void>;
    list: () => Promise<string[]>;
    follow: (followerId: string, followeeId: string) => Promise<void>;
    unfollow: (followerId: string, followeeId: string) => Promise<void>;
    listFollowers: (actorId: string) => Promise<string[]>;
    listFollowing: (actorId: string) => Promise<string[]>;
    actor: {
      read: () => Promise<Record<string, unknown>>;
      update: (key: string, value: string) => Promise<void>;
      delete: (key: string) => Promise<void>;
    };
    pluginActor: {
      create: (
        localName: string,
        profile: Record<string, unknown>,
      ) => Promise<string>;
      read: (iri: string) => Promise<Record<string, unknown>>;
      update: (
        iri: string,
        partial: Record<string, unknown>,
      ) => Promise<void>;
      delete: (iri: string) => Promise<void>;
      list: () => Promise<string[]>;
    };
  };
  cdn?: {
    write: (
      path: string,
      data: string | Uint8Array,
      options?: { cacheTTL?: number },
    ) => Promise<string>;
    read: (path: string) => Promise<string>;
    delete: (path: string) => Promise<void>;
    list: (prefix?: string) => Promise<string[]>;
  };
  extensions?: {
    get?: (id: string) => Extension | undefined;
    /** List of all loaded extensions */
    all?: Extension[];
    onRequest?: (
      name: string,
      handler: (payload: unknown) => unknown | Promise<unknown>,
    ) => () => void;
  };

  request: (name: string, payload: unknown) => Promise<unknown> | void;
  onRequest: (
    name: string,
    handler: (payload: unknown) => unknown | Promise<unknown>,
  ) => void;
  kvRead: (key: string) => Promise<unknown> | void;
  kvWrite: (key: string, value: unknown) => Promise<void> | void;
  kvDelete: (key: string) => Promise<void> | void;
  kvList: (prefix?: string) => Promise<string[]> | void;
  fetchFromTakos: (url: string, init?: RequestInit) => Promise<Response> | void;
}

function request(
  name: string,
  payload: unknown,
): Promise<unknown> | void {
  return api.request?.(name, payload) ??
    api.events?.request?.(name, payload);
}

function onRequest(
  name: string,
  handler: (payload: unknown) => unknown | Promise<unknown>,
): (() => void) | void {
  if (api.onRequest) {
    api.onRequest(name, handler);
    return;
  }
  return api.events?.onRequest?.(name, handler);
}

function kvRead(key: string): Promise<unknown> | void {
  return api.kv?.read?.(key);
}

function kvWrite(key: string, value: unknown): Promise<void> | void {
  return api.kv?.write?.(key, value);
}

function kvDelete(key: string): Promise<void> | void {
  return api.kv?.delete?.(key);
}

function kvList(prefix?: string): Promise<string[]> | void {
  return api.kv?.list?.(prefix);
}

function fetchFromTakos(
  url: string,
  init?: RequestInit,
): Promise<Response> | void {
  return api.fetch?.(url, init);
}

export const simpleTakos: SimpleTakosAPI = {
  ...(api as Partial<SimpleTakosAPI>),
  ap: api.ap,
  request,
  onRequest,
  kvRead,
  kvWrite,
  kvDelete,
  kvList,
  fetchFromTakos,
};

export default simpleTakos;
