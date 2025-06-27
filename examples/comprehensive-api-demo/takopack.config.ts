import { defineConfig } from "../../packages/builder/mod.ts";
import { Takos } from "../../packages/builder/src/classes.ts";

// =============================================================================
// Takopack 3.0 Modern Configuration Extension
// =============================================================================

/**
 * 🆕 Takopack 3.0 統一設定拡張
 * 最新のチェーン形式APIによる設定レベルでのイベント定義
 */
const configExtension = Takos.create();

/**
 * @event extension:init
 * 拡張機能初期化処理
 */
function handleExtensionInit(): void {
  console.log("🚀 [Config Extension] Comprehensive API Demo initialized with Takopack 3.0");
}

/**
 * @event server:ready
 * サーバーレイヤー準備完了処理
 */
function handleServerReady(): void {
  console.log("🌐 [Config Extension] Server layer ready - Advanced features enabled");
}

/**
 * @event client:ready
 * クライアントレイヤー準備完了処理
 */
function handleClientReady(): void {
  console.log("📱 [Config Extension] Client layer ready - Background services activated");
}

/**
 * @event ui:ready
 * UIレイヤー準備完了処理
 */
function handleUIReady(): void {
  console.log("🖼️ [Config Extension] UI layer ready - Interactive features enabled");
}

// 🔗 設定レベルでのクロスレイヤーイベント登録
configExtension
  .server("extension:init", handleExtensionInit)
  .server("server:ready", handleServerReady)
  .client("client:ready", handleClientReady)
  .ui("ui:ready", handleUIReady);

console.log("🚀 [Takopack 3.0 Config] Extension event definitions:", configExtension.getEventDefinitions());

export default defineConfig({
  manifest: {
    name: "Comprehensive Takos API Demo",
    identifier: "jp.takos.comprehensive-api-demo",
    version: "3.0.0",
    description: "🆕 Takopack 3.0 showcase: Modern unified Takos API demonstration with chain-style event definitions, advanced ActivityPub integration, high-performance storage, intelligent caching, real-time communication, and comprehensive security features.",
    
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
