import { defineConfig } from "../../packages/builder/mod.ts";

export default defineConfig({
  manifest: {
    name: "Comprehensive Takos API Demo",
    identifier: "jp.takos.comprehensive-api-demo",
    version: "2.0.0",
    description: "Complete demonstration of all Takos APIs including ActivityPub, Storage, Events, Extensions, and Security features with real-world examples.",
    
    // 全ての有効な権限を定義
    permissions: [
      // ActivityPub Core
      "activitypub:send",
      "activitypub:read", 
      "activitypub:receive:hook",
      "activitypub:actor:read",
      "activitypub:actor:write",
      
      // Plugin Actor Management
      "plugin-actor:create",
      "plugin-actor:read", 
      "plugin-actor:write",
      "plugin-actor:delete",
      
      // Storage & Data
      "kv:read",
      "kv:write", 
      
      // CDN & Media
      "cdn:read",
      "cdn:write",
      
      // Network & External
      "fetch:net",
      
      // Events & Messaging
      "events:publish",
      
      // Extensions & Inter-Plugin
      "extensions:invoke",
      "extensions:export", 
      
      // System & Environment
      "deno:read",
      "deno:write",
      "deno:net",
      "deno:env",
      "deno:run",
      "deno:sys",
      "deno:ffi",
    ],
    
    icon: "./icon.png",
    
    // 全ての主要機能をエクスポート
    exports: [
      // Server exports
      "comprehensiveApiTest",
      "activityPubFullDemo", 
      "storageFullDemo",
      "eventsFullDemo",
      "extensionsFullDemo",
      "securityFullDemo",
      "networkingFullDemo",
      
      // Event handlers
      "onActivityPubReceive",
      "onStorageChange", 
      "onEventReceived",
      "onExtensionInvoke",
      
      // Client exports
      "clientApiDemo",
      "clientStorageDemo",
      "clientEventsDemo", 
      "clientNetworkDemo",
      
      // UI exports
      "showApiDemo",
      "showStorageDemo", 
      "showEventsDemo",
      "showExtensionsDemo",
      
      // Utility exports
      "performanceTest",
      "securityTest",
      "integrationTest",
    ],
  },
  
  entries: {
    server: ["src/server/index.ts"],
    client: ["src/client/index.ts"], 
    ui: ["src/ui/dist/index.html"],
  },
  
  // ビルド設定
  build: {
    outDir: "./dist",
    minify: true,
  },
});
