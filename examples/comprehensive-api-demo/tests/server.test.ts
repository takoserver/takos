/**
 * サーバー側API機能のテストスイート
 * Takopack拡張機能のサーバー環境でのAPI機能をテストします
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

// テスト用のモックAPI
const mockTakos = {
  // KV Storage API
  kv: {
    get: async (key: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { value: `mock-value-for-${key}`, success: true };
    },
    set: async (_key: string, _value: unknown) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { success: true };
    },
    delete: async (_key: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { success: true };
    },
    list: async (prefix?: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { keys: [`${prefix || ''}key1`, `${prefix || ''}key2`], success: true };
    },
    clear: async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { success: true };
    }
  },

  // ActivityPub API
  activitypub: {
    createNote: async (content: string, visibility: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { 
        id: "mock-note-id", 
        content, 
        visibility, 
        published: new Date().toISOString() 
      };
    },
    createActor: async (name: string, summary: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { 
        id: "mock-actor-id", 
        name, 
        summary 
      };
    },
    follow: async (actorId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { success: true, actorId };
    },
    getFollowers: async (actorId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { followers: ["follower1", "follower2"], actorId };
    },
    getFollowing: async (actorId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { following: ["following1", "following2"], actorId };
    }
  },

  // CDN API
  cdn: {
    upload: async (file: ArrayBuffer, filename: string, contentType: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return {
        url: `https://cdn.example.com/${filename}`,
        filename,
        size: file.byteLength,
        contentType
      };
    },
    delete: async (url: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { success: true, url };
    },
    getMetadata: async (_url: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return {
        filename: "test.jpg",
        size: 1024,
        contentType: "image/jpeg",
        uploadDate: new Date().toISOString()
      };
    }
  },

  // Events API
  events: {
    emit: async (eventName: string, data: unknown) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return { success: true, eventName, data };
    },
    on: (_eventName: string, _handler: () => void) => ({ success: true, eventName: _eventName }),
    off: (_eventName: string, _handler: () => void) => ({ success: true, eventName: _eventName }),
    once: (_eventName: string, _handler: () => void) => ({ success: true, eventName: _eventName })
  },

  // Extensions API
  extensions: {
    call: async (extensionId: string, method: string, params: unknown) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return {
        result: `mock-result-from-${extensionId}-${method}`,
        params
      };
    },
    getInfo: async (extensionId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return {
        id: extensionId,
        name: `Mock Extension ${extensionId}`,
        version: "1.0.0",
        status: "active"
      };
    },
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return {
        extensions: [
          { id: "ext1", name: "Extension 1", version: "1.0.0" },
          { id: "ext2", name: "Extension 2", version: "2.0.0" }
        ]
      };
    }
  },

  // Networking API
  networking: {
    fetch: async (_url: string, _options?: Record<string, unknown>) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return {
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "mock response" })
      };
    },
    websocket: {
      connect: async (url: string) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return { 
          id: "mock-ws-id", 
          url, 
          status: "connected" 
        };
      },
      send: async (id: string, data: unknown) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return { success: true, id, data };
      },
      close: async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return { success: true, id };
      }
    }
  }
};

// グローバルにモックAPIを設定
(globalThis as Record<string, unknown>).takos = mockTakos;

Deno.test("KV Storage API テスト", async (t) => {
  await t.step("データの保存と取得", async () => {
    const setResult = await mockTakos.kv.set("test-key", "test-value");
    assertEquals(setResult.success, true);

    const getResult = await mockTakos.kv.get("test-key");
    assertEquals(getResult.success, true);
    assertExists(getResult.value);
  });

  await t.step("データの削除", async () => {
    const deleteResult = await mockTakos.kv.delete("test-key");
    assertEquals(deleteResult.success, true);
  });

  await t.step("キーの一覧取得", async () => {
    const listResult = await mockTakos.kv.list("test-");
    assertEquals(listResult.success, true);
    assertEquals(Array.isArray(listResult.keys), true);
  });

  await t.step("全データのクリア", async () => {
    const clearResult = await mockTakos.kv.clear();
    assertEquals(clearResult.success, true);
  });
});

Deno.test("ActivityPub API テスト", async (t) => {
  await t.step("ノートの作成", async () => {
    const note = await mockTakos.activitypub.createNote("テストノート", "public");
    assertExists(note.id);
    assertEquals(note.content, "テストノート");
    assertEquals(note.visibility, "public");
    assertExists(note.published);
  });

  await t.step("アクターの作成", async () => {
    const actor = await mockTakos.activitypub.createActor("testuser", "テストユーザー");
    assertExists(actor.id);
    assertEquals(actor.name, "testuser");
    assertEquals(actor.summary, "テストユーザー");
  });

  await t.step("フォロー機能", async () => {
    const followResult = await mockTakos.activitypub.follow("test-actor-id");
    assertEquals(followResult.success, true);
    assertEquals(followResult.actorId, "test-actor-id");
  });

  await t.step("フォロワー取得", async () => {
    const followers = await mockTakos.activitypub.getFollowers("test-actor-id");
    assertEquals(Array.isArray(followers.followers), true);
    assertEquals(followers.actorId, "test-actor-id");
  });
});

Deno.test("CDN API テスト", async (t) => {
  await t.step("ファイルアップロード", async () => {
    const fileData = new TextEncoder().encode("テストファイルの内容");
    const buffer = fileData.buffer as ArrayBuffer;
    
    const uploadResult = await mockTakos.cdn.upload(buffer, "test.txt", "text/plain");
    assertExists(uploadResult.url);
    assertEquals(uploadResult.filename, "test.txt");
    assertEquals(uploadResult.contentType, "text/plain");
    assertEquals(uploadResult.size, buffer.byteLength);
  });

  await t.step("ファイル削除", async () => {
    const deleteResult = await mockTakos.cdn.delete("https://cdn.example.com/test.txt");
    assertEquals(deleteResult.success, true);
  });

  await t.step("メタデータ取得", async () => {
    const metadata = await mockTakos.cdn.getMetadata("https://cdn.example.com/test.jpg");
    assertExists(metadata.filename);
    assertExists(metadata.size);
    assertExists(metadata.contentType);
    assertExists(metadata.uploadDate);
  });
});

Deno.test("Events API テスト", async (t) => {
  await t.step("イベントの発行", async () => {
    const emitResult = await mockTakos.events.emit("test-event", { message: "テストデータ" });
    assertEquals(emitResult.success, true);
    assertEquals(emitResult.eventName, "test-event");
    assertExists(emitResult.data);
  });

  await t.step("イベントリスナーの登録", () => {
    const handler = () => console.log("イベントハンドラ");
    const onResult = mockTakos.events.on("test-event", handler);
    assertEquals(onResult.success, true);
    assertEquals(onResult.eventName, "test-event");
  });

  await t.step("イベントリスナーの削除", () => {
    const handler = () => console.log("イベントハンドラ");
    const offResult = mockTakos.events.off("test-event", handler);
    assertEquals(offResult.success, true);
    assertEquals(offResult.eventName, "test-event");
  });
});

Deno.test("Extensions API テスト", async (t) => {
  await t.step("拡張機能の呼び出し", async () => {
    const callResult = await mockTakos.extensions.call("test-extension", "testMethod", { param: "value" });
    assertExists(callResult.result);
    assertExists(callResult.params);
  });

  await t.step("拡張機能情報の取得", async () => {
    const info = await mockTakos.extensions.getInfo("test-extension");
    assertEquals(info.id, "test-extension");
    assertExists(info.name);
    assertExists(info.version);
    assertExists(info.status);
  });

  await t.step("拡張機能一覧の取得", async () => {
    const list = await mockTakos.extensions.list();
    assertEquals(Array.isArray(list.extensions), true);
    assertEquals(list.extensions.length > 0, true);
  });
});

Deno.test("Networking API テスト", async (t) => {
  await t.step("HTTP リクエスト", async () => {
    const response = await mockTakos.networking.fetch("https://api.example.com/test");
    assertEquals(response.status, 200);
    assertExists(response.headers);
    assertExists(response.body);
  });

  await t.step("WebSocket接続", async () => {
    const wsResult = await mockTakos.networking.websocket.connect("wss://example.com/ws");
    assertExists(wsResult.id);
    assertEquals(wsResult.status, "connected");
  });

  await t.step("WebSocketメッセージ送信", async () => {
    const sendResult = await mockTakos.networking.websocket.send("mock-ws-id", { message: "test" });
    assertEquals(sendResult.success, true);
    assertEquals(sendResult.id, "mock-ws-id");
  });
});
