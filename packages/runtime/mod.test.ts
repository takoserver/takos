import { assert, assertEquals } from "jsr:@std/assert";
import { TakoPack } from "./mod.ts";

Deno.test("load takopack and call server function", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "test",
      identifier: "com.example.test",
      version: "0.1.0",
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

Deno.test("builtin asset read", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "asset",
      identifier: "com.example.asset",
      version: "0.1.0",
    }),
    server: "",
    assets: { "icon.txt": "aWNvbg==" },
  };
  const takopack = new TakoPack([pack]);
  await takopack.init();
  const data = await (globalThis as any).takos.assets.read(
    "com.example.asset",
    "icon.txt",
  );
  assertEquals(data, "aWNvbg==");
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("override takos APIs via options", async () => {
  const pack = {
    manifest: JSON.stringify({
      name: "test2",
      identifier: "com.example.test2",
      version: "0.1.0",
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
    }),
    server:
      `export async function send(){ await globalThis.takos.events.publishToClient('ev', {}); return 1; }`,
  };

  let called = false;
  const takopack = new TakoPack([pack], {
    events: {
      publishToClient: async () => {
        called = true;
      },
    },
  });
  await takopack.init();
  await takopack.callServer("com.example.test3", "send");
  assert(called);
  delete (globalThis as Record<string, unknown>).takos;
});

Deno.test("publish event to another pack", async () => {
  const packA = {
    manifest: JSON.stringify({
      name: "a",
      identifier: "com.example.a",
      version: "0.1.0",
      eventDefinitions: {
        hello: { source: "server", target: "server", handler: "hello" },
      },
    }),
    server:
      `export function hello(data, from){ return 'hi '+data.name+' from '+from; }`,
  };
  const packB = {
    manifest: JSON.stringify({
      name: "b",
      identifier: "com.example.b",
      version: "0.1.0",
    }),
    server:
      `export async function run(){ return await globalThis.takos.events.publishToPack('com.example.a','hello',{name:'Bob'}); }`,
  };

  const tp = new TakoPack([packA, packB]);
  await tp.init();
  const res = await tp.callServer("com.example.b", "run");
  assertEquals(res, "hi Bob from com.example.b");
  delete (globalThis as Record<string, unknown>).takos;
});
