// イベント定義のタイプ
export type EventSource = "server" | "client" | "ui" | "background";

export interface EventDefinition {
  source: EventSource;
  handler: string;
}

export interface ExtensionEventRegistry {
  [eventName: string]: EventDefinition;
}

// イベントハンドラーの関数型
export type EventHandler = (...args: unknown[]) => unknown | Promise<unknown>;

/**
 * Takopack拡張機能のメインクラス
 * チェーン形式でのイベント定義をサポート
 * 
 * 使用例:
 * ```typescript
 * const takos = Takos.create()
 *   .server("event1", handler1)
 *   .client("event2", handler2)
 *   .ui("event3", handler3);
 * ```
 */
export class Takos {
  private _events: ExtensionEventRegistry = {};

  /**
   * サーバーサイドイベントハンドラーを登録
   */
  server(eventName: string, handler: EventHandler): this {
    this._events[eventName] = {
      source: "server",
      handler: handler.name || "anonymous"
    };
    return this;
  }

  /**
   * クライアントサイドイベントハンドラーを登録
   */
  client(eventName: string, handler: EventHandler): this {
    this._events[eventName] = {
      source: "client", 
      handler: handler.name || "anonymous"
    };
    return this;
  }

  /**
   * UIサイドイベントハンドラーを登録
   */
  ui(eventName: string, handler: EventHandler): this {
    this._events[eventName] = {
      source: "ui",
      handler: handler.name || "anonymous"
    };
    return this;
  }

  /**
   * バックグラウンドイベントハンドラーを登録
   */
  background(eventName: string, handler: EventHandler): this {
    this._events[eventName] = {
      source: "background",
      handler: handler.name || "anonymous"
    };
    return this;
  }

  /**
   * 登録されたイベント定義を取得
   */
  getEventDefinitions(): ExtensionEventRegistry {
    return { ...this._events };
  }

  /**
   * ファクトリーメソッド：新しいTakosインスタンスを作成
   */
  static create(): Takos {
    return new Takos();
  }
}

// デフォルトエクスポート
export default Takos;
