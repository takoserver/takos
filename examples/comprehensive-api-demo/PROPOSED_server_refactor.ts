/**
 * Comprehensive Takos API Demo - Server Layer
 * 
 * このファイルは、Takopackの全てのサーバーサイドAPI機能を
 * 包括的にデモンストレーションします。
 */

// deno-lint-ignore-file no-explicit-any
import { Takos } from "../../../../packages/builder/src/classes.ts";

const { takos: globalTakos } = globalThis as any;

// =============================================================================
// 統一されたTakos拡張機能インスタンス
// =============================================================================

/**
 * 単一のTakosインスタンス - ビルダーと内部実装の両方で使用
 */
export const takos = new Takos();

// イベントハンドラー関数を定義
function handleActivityPubMessage(...args: unknown[]): void {
  console.log("[Server] ActivityPub message received:", args);
}

function handleKvDataUpdate(...args: unknown[]): void {
  console.log("[Server] KV data updated:", args);
}

function handleCdnFileUpload(...args: unknown[]): void {
  console.log("[Server] CDN file uploaded:", args);
}

function handleExtensionCommunication(...args: unknown[]): void {
  console.log("[Server] Extension communication:", args);
}

// 統一されたイベントハンドラー登録
takos
  .server("comprehensive:test:start", () => console.log("[Server] Comprehensive test started"))
  .server("comprehensive:test:complete", () => console.log("[Server] Comprehensive test completed"))
  .client("client:ready", () => console.log("[Server] Client ready signal received"))
  .ui("ui:interaction", () => console.log("[Server] UI interaction detected"))
  .server("activitypub:message", handleActivityPubMessage)
  .server("kv:update", handleKvDataUpdate)
  .server("cdn:upload", handleCdnFileUpload)
  .server("extension:communicate", handleExtensionCommunication);

console.log("[Server] Event definitions:", takos.getEventDefinitions());

// デモ関数は内部で使用されるため未エクスポート
// ... 既存のデモ関数はそのまま残す

console.log("✅ [Server] Comprehensive Takos API Demo server module loaded successfully");
