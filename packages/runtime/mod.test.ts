import { assert, assertEquals, assertRejects } from "./test_deps.ts";
import { TakoPack } from "./mod.ts";

Deno.test("load takopack and call server function", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "test",
      identifier: "com.example.test",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server: `export function hello(name){ return 'Hello '+name; }`,
  };

  const takopack = new TakoPack([pack]);
  await takopack.init();
  const result = await takopack.callServer("com.example.test", "hello", [
    "world",
  ]);
  assertEquals(result, "Hello world");
  assert((globalThis as any).takos);
  // cleanup
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("override takos APIs via options", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "test2",
      identifier: "com.example.test2",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server:
      `export async function check(){ return await globalThis.takos.kv.read('foo'); }`,
  };

  const takopack = new TakoPack([pack], {
    kv: { read: async (key: string) => `value:${key}` },
  });
  await takopack.init();
  const result = await takopack.callServer("com.example.test2", "check");
  assertEquals(result, "value:foo");
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("override new event APIs", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "test3",
      identifier: "com.example.test3",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server:
      `export async function send(){ await globalThis.takos.events.publish('ev', {}, { push: true }); return 1; }`,
  };

  let called = false;
  const takopack = new TakoPack([pack], {
    events: {
      publish: async () => {
        called = true;
        return undefined;
      },
    },
  });
  await takopack.init();
  await takopack.callServer("com.example.test3", "send");
  assert(called);
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("extensions API activation", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "lib",
      identifier: "com.example.lib",
      version: "0.1.0",
      icon: "./icon.png",
      exports: ["add"],
    }),
    server: `export function add(a,b){return a+b;}`,
  };
  const takopack = new TakoPack([pack]);
  await takopack.init();
  const ext = (globalThis as any).takos.extensions.get("com.example.lib");
  assert(ext);
  const api = await ext.activate();
  const res = await (api as any).publish("add", [1, 2]);
  assertEquals(res, 3);
  const all = (globalThis as any).takos.extensions.all;
  assert(Array.isArray(all));
  assertEquals(all.length, 1);
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("activateExtension from worker", async () => {
  const lib = {
    manifest: JSON.stringify({
      name: "lib2",
      identifier: "com.example.lib2",
      version: "0.1.0",
      icon: "./icon.png",
      exports: ["mul"],
    }),
    server: `export function mul(a,b){return a*b;}`,
  };
  const user = {
    manifest: JSON.stringify({
      name: "user",
      identifier: "com.example.user",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server:
      `export async function run(){ const api = await globalThis.takos.activateExtension('com.example.lib2'); return await api.publish('mul', [2,3]); }`,
  };
  const takopack = new TakoPack([lib, user]);
  await takopack.init();
  const res = await takopack.callServer("com.example.user", "run");
  assertEquals(res, 6);
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("callServer handles handlers on exported objects", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "test6",
      identifier: "com.example.test6",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server: `export const Api = {}; Api.onRun = () => 88;`,
  };
  const takopack = new TakoPack([pack]);
  await takopack.init();
  const result = await takopack.callServer("com.example.test6", "run");
  assertEquals(result, 88);
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("callServer guesses handler name when eventDefinitions missing", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "test7",
      identifier: "com.example.test7",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server: `export const Api = {}; Api.onRun = () => 77;`,
  };
  const takopack = new TakoPack([pack]);
  await takopack.init();
  const result = await takopack.callServer("com.example.test7", "run");
  assertEquals(result, 77);
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("extensions API handles methods on exported objects", async () => {
  const lib = {
    manifest: JSON.stringify({
      name: "libobj",
      identifier: "com.example.libobj",
      version: "0.1.0",
      icon: "./icon.png",
      exports: ["ping"],
    }),
    server: `export const ApiServer = {}; ApiServer.ping = () => 'pong';`,
  };
  const user = {
    manifest: JSON.stringify({
      name: "userobj",
      identifier: "com.example.userobj",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server:
      `export async function call(){ const api = await globalThis.takos.activateExtension('com.example.libobj'); return await api.publish('ping'); }`,
  };
  const takopack = new TakoPack([lib, user]);
  await takopack.init();
  const res = await takopack.callServer("com.example.userobj", "call");
  assertEquals(res, "pong");
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("call uses correct worker for event source", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "sources",
      identifier: "com.example.sources",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server: `export function fromServer(){ return 'server'; }`,
    client:
      `export function fromClient(){ return 'client'; } export function fromUi(){ return 'ui'; }`,
  };
  const tp = new TakoPack([pack]);
  await tp.init();
  const res1 = await tp.call("com.example.sources", "fromServer");
  assertEquals(res1, "server");
  const res2 = await tp.call("com.example.sources", "fromClient");
  assertEquals(res2, "client");
  const res3 = await tp.call("com.example.sources", "fromUi");
  assertEquals(res3, "ui");
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("request from extension to host", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "reqhost",
      identifier: "com.example.reqhost",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server:
      `export async function run(){ return await globalThis.takos.events.request('ping', 'hi'); }`,
  };
  const tp = new TakoPack([pack]);
  await tp.init();
  (globalThis as any).takos.events.onRequest(
    "ping",
    (msg: string) => msg + "!",
  );
  const res = await tp.callServer("com.example.reqhost", "run");
  assertEquals(res, "hi!");
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("request from host to extension", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "reqext",
      identifier: "com.example.reqext",
      version: "0.1.0",
      icon: "./icon.png",
    }),
    server:
      `export function setup(){ globalThis.takos.events.onRequest('echo', (v) => v + ' from ext'); }`,
  };
  const tp = new TakoPack([pack]);
  await tp.init();
  await tp.callServer("com.example.reqext", "setup");
  const result = await (tp as any).serverTakos.events.request("echo", "hi");
  assertEquals(result, "hi from ext");
  delete (globalThis as Record<string, unknown>).takos;
});
