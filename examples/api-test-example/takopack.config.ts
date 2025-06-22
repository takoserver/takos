import { defineConfig } from "../../packages/builder/mod.ts";

export default defineConfig({
  manifest: {
    name: "API Test Example",
    identifier: "jp.takos.api-test-example",
    version: "1.0.0",
    description: "Demonstrates usage of Takos v3 APIs",
    permissions: [
      "kv:read",
      "kv:write",
      "events:publish",
      "extensions:invoke",
      "activitypub:send",
      "activitypub:read",
      "cdn:read",
      "cdn:write",
    ],
    exports: ["ping", "saveKV", "readKV"],
  },
  entries: {
    server: ["src/server/api.ts"],
    client: ["src/client/api.ts"],
    ui: ["src/ui/index.html"],
  },
  build: {
    target: "es2022",
    dev: false,
    analysis: true,
    outDir: "dist",
  },
});
