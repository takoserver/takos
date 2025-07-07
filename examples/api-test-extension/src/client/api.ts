import { ClientExtension } from "@takopack/builder/src/classes.ts";
import { getTakosClientAPI } from "@takopack/builder/src/api-helpers.ts";

export const ApiClient = new ClientExtension();

async function run<T>(fn: () => Promise<T>): Promise<[number, T | { error: string }]> {
  try {
    return [200, await fn()];
  } catch (err) {
    return [500, { error: String(err) }];
  }
}

async function testKv() {
  const t = getTakosClientAPI();
  await t?.kv.write("client:test", "ok");
  const value = await t?.kv.read("client:test");
  await t?.kv.delete("client:test");
  return { value };
}

async function testCdn() {
  const t = getTakosClientAPI();
  await t?.cdn.write("client.txt", "hello", { cacheTTL: 0 });
  const data = await t?.cdn.read("client.txt");
  await t?.cdn.delete("client.txt");
  return { data };
}

async function testEvents() {
  const t = getTakosClientAPI();
  let flag = false;
  const unsub = t?.events.subscribe("clientPing", () => { flag = true; });
  await t?.events.publish("clientPing", {});
  unsub?.();
  return { received: flag };
}


async function testExtensions() {
  const t = getTakosClientAPI();
  const ext = t?.extensions.get("com.example.api-test");
  const api = await t?.activateExtension("com.example.api-test");
  return { has: !!ext, activated: typeof api?.publish === "function" };
}

async function testFetch() {
  const t = getTakosClientAPI();
  const res = await t?.fetch("https://example.com");
  return { ok: res?.ok ?? false };
}

/** @event("clientKv", { source: "ui" }) */
ApiClient.onClientKv = async (): Promise<[number, Record<string, unknown>]> => {
  return await run(testKv);
};

/** @event("clientCdn", { source: "ui" }) */
ApiClient.onClientCdn = async (): Promise<[number, Record<string, unknown>]> => {
  return await run(testCdn);
};

/** @event("clientEvents", { source: "ui" }) */
ApiClient.onClientEvents = async (): Promise<[number, Record<string, unknown>]> => {
  return await run(testEvents);
};


/** @event("clientExtensions", { source: "ui" }) */
ApiClient.onClientExtensions = async (): Promise<[number, Record<string, unknown>]> => {
  return await run(testExtensions);
};

/** @event("clientFetch", { source: "ui" }) */
ApiClient.onClientFetch = async (): Promise<[number, Record<string, unknown>]> => {
  return await run(testFetch);
};
