import { defineConfig } from "../../packages/builder/mod.ts";

export default defineConfig({
  manifest: {
    name: "API Test Extension",
    identifier: "jp.takos.api-test",
    version: "1.1.2",
    description:
      "Comprehensive testing extension for all Takos APIs including ActivityPub, KV storage, CDN, Events, and Extensions API.",
    permissions: [
      // ActivityPub permissions
      "activitypub:send",
      "activitypub:read",
      "activitypub:actor:read",
      "activitypub:actor:write",
      "plugin-actor:create",
      "plugin-actor:read",
      "plugin-actor:write",
      "plugin-actor:delete",
      // Storage and network
      "kv:read",
      "kv:write",
      "cdn:read",
      "cdn:write",
      "fetch:net",
      // Events and extensions
      "extensions:invoke",
      // Deno permissions for advanced operations
      "deno:read",
      "deno:write",
      "deno:net",
      "deno:env",
    ],
    icon: "./icon.png",
  },
  entries: {
    server: ["src/server/api.ts"],
    client: ["src/client/api.ts"],
    ui: ["src/ui/dist/client/index.html"],
  },

  build: {
    target: "es2022",
    dev: false,
    outDir: "dist",
    minify: false, // デバッグのためminifyを無効化
  },
});
