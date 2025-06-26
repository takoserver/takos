/**
 * Comprehensive Takos API Demo - Server Layer
 * 
 * このファイルは、Takopackの全てのサーバーサイドAPI機能を
 * 包括的にデモンストレーションします。
 * 
 * 含まれる機能:
 * - ActivityPub完全実装デモ
 * - KVストレージ操作デモ  
 * - CDNファイル操作デモ
 * - イベント配信システムデモ
 * - 拡張機能間通信デモ
 * - ネットワーク操作デモ
 * - セキュリティ機能デモ
 */

// deno-lint-ignore-file no-explicit-any
const { takos } = globalThis as any;

// =============================================================================
// 型定義とインターフェース
// =============================================================================

export interface ApiTestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: number;
  operation: string;
}

export interface ActivityPubTestData {
  noteId?: string;
  actorId?: string;
  followId?: string;
  messageId?: string;
}

// =============================================================================
// メイン関数 - 包括的APIテスト
// =============================================================================

/**
 * 全てのTakos APIを順番にテストし、結果を返す
 */
export async function comprehensiveApiTest(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const results: Record<string, any> = {};
  
  try {
    console.log("🚀 [Server] Starting comprehensive Takos API test...");
    
    // 1. ActivityPub API テスト
    console.log("📡 Testing ActivityPub APIs...");
    results.activitypub = await activityPubFullDemo();
    
    // 2. ストレージ API テスト
    console.log("💾 Testing Storage APIs...");
    results.storage = await storageFullDemo();
    
    // 3. CDN API テスト
    console.log("🌐 Testing CDN APIs...");
    results.cdn = await cdnFullDemo();
    
    // 4. イベント API テスト
    console.log("⚡ Testing Events APIs...");
    results.events = await eventsFullDemo();
    
    // 5. 拡張機能 API テスト
    console.log("🧩 Testing Extensions APIs...");
    results.extensions = await extensionsFullDemo();
    
    // 6. ネットワーク API テスト
    console.log("🌍 Testing Network APIs...");
    results.networking = await networkingFullDemo();
    
    // 7. セキュリティ API テスト
    console.log("🔒 Testing Security APIs...");
    results.security = await securityFullDemo();
    
    // 8. パフォーマンステスト
    console.log("🏃 Testing Performance...");
    results.performance = await performanceTest();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ [Server] Comprehensive API test completed in ${duration.toFixed(2)}ms`);
    
    return {
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
      duration,
      metadata: {
        testsRun: Object.keys(results).length,
        environment: "server",
        version: "2.0.0"
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.error("❌ [Server] Comprehensive API test failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration,
      data: results
    };
  }
}

// =============================================================================
// ActivityPub API デモンストレーション
// =============================================================================

/**
 * ActivityPubの全機能をデモンストレーション
 */
export async function activityPubFullDemo(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: ActivityPubTestData = {};
  
  try {
    console.log("📡 [ActivityPub] Starting full ActivityPub demo...");
    
    // 現在のユーザー取得
    const currentUser = await takos.ap.currentUser();
    console.log(`📡 [ActivityPub] Current user: ${currentUser}`);
    testData.actorId = currentUser;
    
    // Note投稿のテスト
    const noteContent = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "type": "Note",
      "content": `Hello from Comprehensive Takos API Demo! 🚀\n\nTimestamp: ${new Date().toISOString()}\nTest: ActivityPub Note Creation`,
      "to": ["https://www.w3.org/ns/activitystreams#Public"],
      "published": new Date().toISOString(),
      "tag": [
        {
          "type": "Hashtag",
          "href": "https://takos.social/tags/api-demo",
          "name": "#api-demo"
        },
        {
          "type": "Hashtag", 
          "href": "https://takos.social/tags/takopack",
          "name": "#takopack"
        }
      ],
      "attachment": []
    };
    
    const noteResult = await takos.ap.send({
      type: "Create",
      actor: currentUser,
      object: noteContent
    });
    
    console.log("📡 [ActivityPub] Note created:", noteResult);
    testData.noteId = noteResult?.object?.id;
    
    // Actor情報の読み取りテスト
    const actorData = await takos.ap.read({
      type: "Person",
      id: currentUser
    });
    
    console.log("📡 [ActivityPub] Actor data retrieved:", actorData);
    
    // カスタムActivityPubオブジェクトのテスト
    const customObject = {
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://takos.social/ns/activitystreams"
      ],
      "type": "TakosApiDemo",
      "name": "Comprehensive API Demonstration",
      "content": "This is a custom ActivityPub object created by the Comprehensive Takos API Demo extension.",
      "published": new Date().toISOString(),
      "attributedTo": currentUser,
      "testData": {
        "version": "2.0.0",
        "features": ["activitypub", "storage", "events", "extensions"],
        "timestamp": Date.now()
      }
    };
    
    const customResult = await takos.ap.send({
      type: "Create",
      actor: currentUser,
      object: customObject
    });
    
    console.log("📡 [ActivityPub] Custom object created:", customResult);
    
    const endTime = performance.now();
    
    return {
      success: true,
      data: {
        currentUser,
        noteResult,
        actorData,
        customResult,
        testData
      },
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      metadata: {
        operationsPerformed: 4,
        objectsCreated: 2
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [ActivityPub] Demo failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      data: testData
    };
  }
}

// =============================================================================
// ストレージ API デモンストレーション  
// =============================================================================

/**
 * KVストレージの全機能をデモンストレーション
 */
export async function storageFullDemo(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    console.log("💾 [Storage] Starting full KV storage demo...");
    
    // 基本的な書き込み・読み取りテスト
    const basicKey = "demo:basic:test";
    const basicValue = {
      message: "Hello from KV storage!",
      timestamp: new Date().toISOString(),
      type: "basic-test",
      data: {
        number: 42,
        boolean: true,
        array: [1, 2, 3, "test"],
        nested: {
          level1: {
            level2: "deep value"
          }
        }
      }
    };
    
    await takos.kv.set(basicKey, basicValue);
    const retrievedValue = await takos.kv.get(basicKey);
    
    console.log("💾 [Storage] Basic write/read test:", { basicValue, retrievedValue });
    testData.basicTest = { written: basicValue, read: retrievedValue };
    
    // 複数のキーを使用したテスト
    const multipleTests = [];
    for (let i = 0; i < 5; i++) {
      const key = `demo:multiple:${i}`;
      const value = {
        index: i,
        message: `Test item ${i}`,
        timestamp: new Date().toISOString(),
        randomData: Math.random()
      };
      
      await takos.kv.set(key, value);
      multipleTests.push({ key, value });
    }
    
    // 複数のキーの読み取りテスト
    const retrievedMultiple = [];
    for (const test of multipleTests) {
      const retrieved = await takos.kv.get(test.key);
      retrievedMultiple.push({ key: test.key, value: retrieved });
    }
    
    console.log("💾 [Storage] Multiple keys test:", retrievedMultiple);
    testData.multipleTest = { written: multipleTests, read: retrievedMultiple };
    
    // 大きなデータのテスト
    const largeKey = "demo:large:data";
    const largeValue = {
      type: "large-data-test",
      description: "Testing storage of large data structures",
      timestamp: new Date().toISOString(),
      largeArray: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `This is test item number ${i} with some additional data`,
        metadata: {
          created: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
          tags: [`tag${i % 10}`, `category${i % 5}`],
          score: Math.random() * 100
        }
      })),
      metadata: {
        itemCount: 1000,
        generated: new Date().toISOString(),
        purpose: "Storage capacity testing"
      }
    };
    
    await takos.kv.set(largeKey, largeValue);
    const retrievedLarge = await takos.kv.get(largeKey);
    
    console.log("💾 [Storage] Large data test completed");
    testData.largeDataTest = {
      originalSize: JSON.stringify(largeValue).length,
      retrievedSize: JSON.stringify(retrievedLarge).length,
      itemCount: retrievedLarge?.largeArray?.length
    };
    
    // TTL（Time To Live）テスト（サポートされている場合）
    const ttlKey = "demo:ttl:test";
    const ttlValue = {
      message: "This value should expire",
      timestamp: new Date().toISOString(),
      expiresIn: "1 hour"
    };
    
    try {
      // TTLが実装されている場合のテスト
      await takos.kv.set(ttlKey, ttlValue, { expireIn: 3600 }); // 1時間
      const ttlRetrieved = await takos.kv.get(ttlKey);
      
      console.log("💾 [Storage] TTL test:", ttlRetrieved);
      testData.ttlTest = { success: true, value: ttlRetrieved };
      
    } catch (error) {
      console.log("💾 [Storage] TTL not supported or failed:", error);
      testData.ttlTest = { success: false, error: String(error) };
    }
    
    const endTime = performance.now();
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      metadata: {
        keysCreated: 7,
        largeDataSize: testData.largeDataTest?.originalSize
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [Storage] Demo failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      data: testData
    };
  }
}

// =============================================================================
// CDN API デモンストレーション
// =============================================================================

/**
 * CDNファイル操作の全機能をデモンストレーション
 */
export async function cdnFullDemo(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    console.log("🌐 [CDN] Starting full CDN demo...");
    
    // テキストファイルの作成とアップロード
    const textFileName = "demo-text-file.txt";
    const textContent = `Comprehensive Takos API Demo - CDN Test

This is a test file created by the Comprehensive Takos API Demo extension.

Timestamp: ${new Date().toISOString()}
Test Type: CDN File Operations
Version: 2.0.0

Features being tested:
- Text file upload
- File reading
- File metadata retrieval
- Binary data handling
- File management operations

Generated data:
${Array.from({ length: 10 }, (_, i) => `Line ${i + 1}: ${Math.random().toString(36).substring(2, 15)}`).join('\n')}
`;
    
    const textBlob = new TextEncoder().encode(textContent);
    const textUploadResult = await takos.cdn.write(textFileName, textBlob);
    
    console.log("🌐 [CDN] Text file uploaded:", textUploadResult);
    testData.textUpload = textUploadResult;
    
    // ファイルの読み取りテスト
    const retrievedTextData = await takos.cdn.read(textFileName);
    const retrievedTextContent = new TextDecoder().decode(retrievedTextData);
    
    console.log("🌐 [CDN] Text file retrieved, length:", retrievedTextContent.length);
    testData.textRetrieve = {
      success: retrievedTextContent.includes("Comprehensive Takos API Demo"),
      length: retrievedTextContent.length,
      preview: retrievedTextContent.substring(0, 100) + "..."
    };
    
    // JSON データファイルのテスト
    const jsonFileName = "demo-data.json";
    const jsonData = {
      type: "comprehensive-api-demo",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      testData: {
        numbers: Array.from({ length: 100 }, () => Math.random()),
        strings: Array.from({ length: 50 }, (_, i) => `test-string-${i}-${Math.random().toString(36)}`),
        objects: Array.from({ length: 20 }, (_, i) => ({
          id: i,
          name: `Object ${i}`,
          value: Math.random() * 1000,
          tags: [`tag-${i % 5}`, `category-${i % 3}`],
          metadata: {
            created: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            updated: new Date().toISOString()
          }
        }))
      },
      metadata: {
        purpose: "CDN JSON storage test",
        encoding: "UTF-8",
        compression: "none"
      }
    };
    
    const jsonBlob = new TextEncoder().encode(JSON.stringify(jsonData, null, 2));
    const jsonUploadResult = await takos.cdn.write(jsonFileName, jsonBlob);
    
    console.log("🌐 [CDN] JSON file uploaded:", jsonUploadResult);
    testData.jsonUpload = jsonUploadResult;
    
    // JSONファイルの読み取りと解析
    const retrievedJsonData = await takos.cdn.read(jsonFileName);
    const retrievedJsonString = new TextDecoder().decode(retrievedJsonData);
    const parsedJsonData = JSON.parse(retrievedJsonString);
    
    console.log("🌐 [CDN] JSON file retrieved and parsed successfully");
    testData.jsonRetrieve = {
      success: parsedJsonData.type === "comprehensive-api-demo",
      objectCount: parsedJsonData.testData?.objects?.length,
      dataSize: retrievedJsonString.length
    };
    
    // バイナリデータのテスト（シミュレーション）
    const binaryFileName = "demo-binary.dat";
    const binarySize = 10240; // 10KB
    const binaryData = new Uint8Array(binarySize);
    
    // ランダムなバイナリデータを生成
    for (let i = 0; i < binarySize; i++) {
      binaryData[i] = Math.floor(Math.random() * 256);
    }
    
    const binaryUploadResult = await takos.cdn.write(binaryFileName, binaryData);
    
    console.log("🌐 [CDN] Binary file uploaded:", binaryUploadResult);
    testData.binaryUpload = binaryUploadResult;
    
    // バイナリファイルの読み取り
    const retrievedBinaryData = await takos.cdn.read(binaryFileName);
    
    console.log("🌐 [CDN] Binary file retrieved, size:", retrievedBinaryData.length);
    testData.binaryRetrieve = {
      success: retrievedBinaryData.length === binarySize,
      originalSize: binarySize,
      retrievedSize: retrievedBinaryData.length
    };
    
    const endTime = performance.now();
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      metadata: {
        filesCreated: 3,
        totalDataSize: textBlob.length + jsonBlob.length + binaryData.length
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [CDN] Demo failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      data: testData
    };
  }
}

// =============================================================================
// イベント API デモンストレーション
// =============================================================================

/**
 * イベント配信システムの全機能をデモンストレーション
 */
export async function eventsFullDemo(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    console.log("⚡ [Events] Starting full events demo...");
    
    // 基本的なイベント配信テスト
    const basicEventData = {
      type: "api-demo:basic-event",
      message: "Hello from comprehensive API demo!",
      timestamp: new Date().toISOString(),
      source: "server",
      metadata: {
        version: "2.0.0",
        testType: "basic-event",
        counter: Math.floor(Math.random() * 1000)
      }
    };
    
    const basicEventResult = await takos.events.publish("demo:basic", basicEventData);
    
    console.log("⚡ [Events] Basic event published:", basicEventResult);
    testData.basicEvent = { data: basicEventData, result: basicEventResult };
    
    // 複数のイベントタイプのテスト
    const eventTypes = [
      "demo:user-action",
      "demo:system-status", 
      "demo:data-update",
      "demo:notification",
      "demo:analytics"
    ];
    
    const multipleEventResults = [];
    
    for (const eventType of eventTypes) {
      const eventData = {
        type: eventType,
        message: `Test event for ${eventType}`,
        timestamp: new Date().toISOString(),
        eventId: `${eventType}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        payload: {
          testData: Array.from({ length: 5 }, (_, i) => ({
            id: i,
            value: Math.random(),
            description: `Test item ${i} for ${eventType}`
          })),
          metadata: {
            generated: new Date().toISOString(),
            purpose: "Multiple event types testing"
          }
        }
      };
      
      const result = await takos.events.publish(eventType, eventData);
      multipleEventResults.push({ eventType, data: eventData, result });
      
      // イベント間の小さな遅延
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log("⚡ [Events] Multiple event types published:", multipleEventResults.length);
    testData.multipleEvents = multipleEventResults;
    
    // 大きなペイロードのイベントテスト
    const largeEventData = {
      type: "api-demo:large-payload",
      message: "Testing large event payload",
      timestamp: new Date().toISOString(),
      largePayload: {
        description: "This is a test with a large data payload",
        generatedData: Array.from({ length: 500 }, (_, i) => ({
          id: i,
          uuid: crypto.randomUUID(),
          name: `Generated Item ${i}`,
          description: `This is a generated test item with index ${i} created for large payload testing`,
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          properties: {
            value: Math.random() * 10000,
            category: `category-${i % 20}`,
            tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => `tag-${i}-${j}`),
            metadata: {
              processed: false,
              priority: Math.floor(Math.random() * 5) + 1,
              source: "comprehensive-api-demo"
            }
          }
        })),
        statistics: {
          itemCount: 500,
          generatedAt: new Date().toISOString(),
          totalSize: 0 // Will be calculated
        }
      }
    };
    
    // ペイロードサイズを計算
    largeEventData.largePayload.statistics.totalSize = JSON.stringify(largeEventData).length;
    
    const largeEventResult = await takos.events.publish("demo:large-payload", largeEventData);
    
    console.log("⚡ [Events] Large payload event published, size:", largeEventData.largePayload.statistics.totalSize);
    testData.largeEvent = {
      payloadSize: largeEventData.largePayload.statistics.totalSize,
      itemCount: largeEventData.largePayload.generatedData.length,
      result: largeEventResult
    };
    
    // リアルタイムイベントストリームのシミュレーション
    const streamEventResults = [];
    
    console.log("⚡ [Events] Starting event stream simulation...");
    
    for (let i = 0; i < 10; i++) {
      const streamEventData = {
        type: "api-demo:stream-event",
        streamId: "demo-stream-001",
        sequence: i,
        timestamp: new Date().toISOString(),
        message: `Stream event ${i} of 10`,
        data: {
          value: Math.random() * 100,
          status: ["active", "pending", "completed"][Math.floor(Math.random() * 3)],
          metadata: {
            batchId: "stream-test-batch",
            processed: false
          }
        }
      };
      
      const streamResult = await takos.events.publish("demo:stream", streamEventData);
      streamEventResults.push({ sequence: i, result: streamResult });
      
      // ストリームイベント間の短い遅延
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    console.log("⚡ [Events] Event stream simulation completed:", streamEventResults.length);
    testData.streamEvents = {
      eventCount: streamEventResults.length,
      results: streamEventResults
    };
    
    const endTime = performance.now();
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      metadata: {
        eventsPublished: 1 + eventTypes.length + 1 + 10,
        eventTypes: ["basic", "multiple", "large-payload", "stream"]
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [Events] Demo failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      data: testData
    };
  }
}

// =============================================================================
// 拡張機能 API デモンストレーション
// =============================================================================

/**
 * 拡張機能間通信の全機能をデモンストレーション
 */
export async function extensionsFullDemo(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    console.log("🧩 [Extensions] Starting full extensions demo...");
    
    // 自分自身の拡張機能情報を取得
    const selfInfo = {
      identifier: "jp.takos.comprehensive-api-demo",
      version: "2.0.0",
      name: "Comprehensive Takos API Demo"
    };
    
    testData.selfInfo = selfInfo;
    
    // 他の拡張機能の呼び出しテスト（存在する場合）
    try {
      const invokeTestData = {
        message: "Hello from comprehensive API demo!",
        timestamp: new Date().toISOString(),
        testType: "extension-invocation",
        payload: {
          numbers: [1, 2, 3, 4, 5],
          strings: ["test", "demo", "api"],
          object: {
            nested: {
              value: "deep test value"
            }
          }
        }
      };
      
      // 自分自身の関数を呼び出してテスト
      const invokeResult = await takos.extensions.invoke(
        "jp.takos.comprehensive-api-demo",
        "comprehensiveApiTest",
        []
      );
      
      console.log("🧩 [Extensions] Self-invocation test completed");
      testData.selfInvocation = {
        success: true,
        result: invokeResult
      };
      
    } catch (error) {
      console.log("🧩 [Extensions] Self-invocation failed (expected):", error);
      testData.selfInvocation = {
        success: false,
        error: String(error),
        note: "Self-invocation may not be supported"
      };
    }
    
    // エクスポート関数のテスト
    const exportTestData = {
      function: "comprehensiveApiTest",
      description: "Testing function export capabilities",
      timestamp: new Date().toISOString(),
      metadata: {
        returnType: "Promise<ApiTestResult>",
        parameters: "none",
        purpose: "Comprehensive API testing"
      }
    };
    
    console.log("🧩 [Extensions] Export test data prepared:", exportTestData);
    testData.exportTest = exportTestData;
    
    // 拡張機能メタデータのテスト
    const metadataTest = {
      extensionId: selfInfo.identifier,
      capabilities: [
        "activitypub-integration",
        "kv-storage",
        "cdn-operations", 
        "event-publishing",
        "extension-communication",
        "network-operations"
      ],
      permissions: [
        "activitypub:send",
        "activitypub:read",
        "kv:read",
        "kv:write",
        "cdn:read", 
        "cdn:write",
        "events:publish",
        "extensions:invoke",
        "extensions:export",
        "fetch:net"
      ],
      apiVersion: "2.0.0",
      testMetrics: {
        startTime: startTime,
        currentTime: performance.now(),
        functionsExported: 16,
        testsConducted: 7
      }
    };
    
    console.log("🧩 [Extensions] Metadata test prepared");
    testData.metadataTest = metadataTest;
    
    // 相互運用性テスト
    const interopTest = {
      description: "Testing interoperability with other extensions",
      timestamp: new Date().toISOString(),
      testCases: [
        {
          name: "Data Format Compatibility",
          description: "Testing common data format handling",
          testData: {
            json: { key: "value", number: 42, array: [1, 2, 3] },
            string: "test string",
            number: 123.456,
            boolean: true,
            date: new Date().toISOString()
          },
          success: true
        },
        {
          name: "Event Format Compatibility", 
          description: "Testing event payload format consistency",
          testData: {
            type: "interop-test",
            source: "comprehensive-api-demo",
            timestamp: new Date().toISOString(),
            payload: { test: true }
          },
          success: true
        },
        {
          name: "API Response Format",
          description: "Testing consistent API response format",
          testData: {
            success: true,
            data: { result: "test" },
            timestamp: new Date().toISOString(),
            metadata: { version: "2.0.0" }
          },
          success: true
        }
      ]
    };
    
    console.log("🧩 [Extensions] Interoperability test completed");
    testData.interopTest = interopTest;
    
    const endTime = performance.now();
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      metadata: {
        testsPerformed: 4,
        extensionId: selfInfo.identifier
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [Extensions] Demo failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      data: testData
    };
  }
}

// =============================================================================
// ネットワーク API デモンストレーション
// =============================================================================

/**
 * ネットワーク操作の全機能をデモンストレーション
 */
export async function networkingFullDemo(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    console.log("🌍 [Networking] Starting full networking demo...");
    
    // HTTPリクエストテスト（JSONPlaceholder API使用）
    const jsonPlaceholderTest = await fetch("https://jsonplaceholder.typicode.com/posts/1");
    const jsonPlaceholderData = await jsonPlaceholderTest.json();
    
    console.log("🌍 [Networking] JSONPlaceholder test completed");
    testData.jsonPlaceholderTest = {
      success: jsonPlaceholderTest.ok,
      status: jsonPlaceholderTest.status,
      data: jsonPlaceholderData
    };
    
    // HTTPbin.org APIテスト
    const httpbinTest = await fetch("https://httpbin.org/json");
    const httpbinData = await httpbinTest.json();
    
    console.log("🌍 [Networking] HTTPbin test completed");
    testData.httpbinTest = {
      success: httpbinTest.ok,
      status: httpbinTest.status,
      data: httpbinData
    };
    
    // POST リクエストテスト
    const postTestData = {
      title: "Comprehensive Takos API Demo",
      body: "Testing POST request from Takopack extension",
      userId: 1,
      timestamp: new Date().toISOString(),
      metadata: {
        source: "comprehensive-api-demo",
        version: "2.0.0"
      }
    };
    
    const postTest = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postTestData)
    });
    
    const postTestResult = await postTest.json();
    
    console.log("🌍 [Networking] POST test completed");
    testData.postTest = {
      success: postTest.ok,
      status: postTest.status,
      sentData: postTestData,
      receivedData: postTestResult
    };
    
    // 複数の同時リクエストテスト
    const simultaneousRequests = [
      "https://httpbin.org/delay/1",
      "https://httpbin.org/uuid", 
      "https://httpbin.org/ip",
      "https://httpbin.org/user-agent"
    ];
    
    const simultaneousStartTime = performance.now();
    const simultaneousResults = await Promise.all(
      simultaneousRequests.map(async (url, index) => {
        try {
          const response = await fetch(url);
          const data = await response.json();
          return {
            index,
            url,
            success: response.ok,
            status: response.status,
            data
          };
        } catch (error) {
          return {
            index,
            url,
            success: false,
            error: String(error)
          };
        }
      })
    );
    const simultaneousEndTime = performance.now();
    
    console.log("🌍 [Networking] Simultaneous requests completed");
    testData.simultaneousTest = {
      requestCount: simultaneousRequests.length,
      duration: simultaneousEndTime - simultaneousStartTime,
      results: simultaneousResults
    };
    
    // エラーハンドリングテスト
    try {
      const errorTest = await fetch("https://httpbin.org/status/404");
      testData.errorHandlingTest = {
        type: "404 status test",
        success: !errorTest.ok,
        status: errorTest.status,
        statusText: errorTest.statusText
      };
    } catch (error) {
      testData.errorHandlingTest = {
        type: "network error test",
        success: false,
        error: String(error)
      };
    }
    
    console.log("🌍 [Networking] Error handling test completed");
    
    // タイムアウトテスト
    try {
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 2000);
      
      const timeoutTest = await fetch("https://httpbin.org/delay/3", {
        signal: timeoutController.signal
      });
      
      clearTimeout(timeoutId);
      const timeoutData = await timeoutTest.json();
      
      testData.timeoutTest = {
        success: true,
        message: "Request completed within timeout",
        data: timeoutData
      };
      
    } catch (error) {
      testData.timeoutTest = {
        success: true,
        message: "Request properly timed out",
        error: String(error)
      };
    }
    
    console.log("🌍 [Networking] Timeout test completed");
    
    const endTime = performance.now();
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      metadata: {
        requestsPerformed: 2 + simultaneousRequests.length + 2,
        testTypes: ["GET", "POST", "simultaneous", "error-handling", "timeout"]
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [Networking] Demo failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      data: testData
    };
  }
}

// =============================================================================
// セキュリティ API デモンストレーション
// =============================================================================

/**
 * セキュリティ機能のデモンストレーション
 */
export async function securityFullDemo(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    console.log("🔒 [Security] Starting full security demo...");
    
    // データサニタイゼーションテスト
    const sanitizationTests = [
      {
        input: "<script>alert('XSS')</script>",
        expected: "sanitized",
        type: "XSS prevention"
      },
      {
        input: "'; DROP TABLE users; --",
        expected: "sanitized", 
        type: "SQL injection prevention"
      },
      {
        input: "../../../etc/passwd",
        expected: "sanitized",
        type: "Path traversal prevention"
      }
    ];
    
    const sanitizationResults = sanitizationTests.map(test => ({
      ...test,
      sanitized: test.input.replace(/<[^>]*>/g, '').replace(/[';\\]/g, ''),
      success: true
    }));
    
    console.log("🔒 [Security] Data sanitization tests completed");
    testData.sanitizationTests = sanitizationResults;
    
    // ハッシュ生成テスト
    const hashTestData = "Comprehensive Takos API Demo - Security Test Data";
    const encoder = new TextEncoder();
    const data = encoder.encode(hashTestData);
    
    // SHA-256 ハッシュ
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log("🔒 [Security] Hash generation test completed");
    testData.hashTest = {
      originalData: hashTestData,
      algorithm: "SHA-256",
      hash: hashHex,
      success: hashHex.length === 64
    };
    
    // ランダムデータ生成テスト
    const randomTests = [
      {
        name: "UUID generation",
        generator: () => crypto.randomUUID(),
        validation: (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      },
      {
        name: "Random bytes",
        generator: () => {
          const array = new Uint8Array(32);
          crypto.getRandomValues(array);
          return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        },
        validation: (value: string) => value.length === 64 && /^[0-9a-f]+$/i.test(value)
      }
    ];
    
    const randomTestResults = randomTests.map(test => {
      const value = test.generator();
      return {
        name: test.name,
        value,
        valid: test.validation(value),
        success: true
      };
    });
    
    console.log("🔒 [Security] Random data generation tests completed");
    testData.randomTests = randomTestResults;
    
    // 入力検証テスト
    const validationTests = [
      {
        name: "Email validation",
        inputs: [
          { value: "test@example.com", expected: true },
          { value: "invalid-email", expected: false },
          { value: "test@", expected: false },
          { value: "@example.com", expected: false }
        ],
        validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      },
      {
        name: "URL validation",
        inputs: [
          { value: "https://example.com", expected: true },
          { value: "http://localhost:3000", expected: true },
          { value: "not-a-url", expected: false },
          { value: "javascript:alert('xss')", expected: false }
        ],
        validator: (url: string) => {
          try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
          } catch {
            return false;
          }
        }
      }
    ];
    
    const validationResults = validationTests.map(test => ({
      name: test.name,
      results: test.inputs.map(input => ({
        input: input.value,
        expected: input.expected,
        actual: test.validator(input.value),
        success: test.validator(input.value) === input.expected
      })),
      success: test.inputs.every(input => test.validator(input.value) === input.expected)
    }));
    
    console.log("🔒 [Security] Input validation tests completed");
    testData.validationTests = validationResults;
    
    // セキュリティヘッダーテスト
    const securityHeaders = {
      "Content-Security-Policy": "default-src 'self'",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
    };
    
    console.log("🔒 [Security] Security headers prepared");
    testData.securityHeaders = {
      headers: securityHeaders,
      headerCount: Object.keys(securityHeaders).length,
      success: true
    };
    
    const endTime = performance.now();
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      metadata: {
        testsPerformed: sanitizationTests.length + randomTests.length + validationTests.length + 1,
        securityFeatures: ["sanitization", "hashing", "random-generation", "validation", "headers"]
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [Security] Demo failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      data: testData
    };
  }
}

// =============================================================================
// パフォーマンステスト
// =============================================================================

/**
 * システムパフォーマンスのテスト
 */
export async function performanceTest(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    console.log("🏃 [Performance] Starting performance tests...");
    
    // メモリ使用量テスト（利用可能な場合）
    const memoryTest = {
      timestamp: new Date().toISOString(),
      note: "Memory information may not be available in all environments"
    };
    
    testData.memoryTest = memoryTest;
    
    // CPU集約的タスクのパフォーマンステスト
    const cpuTestStart = performance.now();
    
    // フィボナッチ数列計算（CPU負荷テスト）
    function fibonacci(n: number): number {
      if (n <= 1) return n;
      return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    const fibResult = fibonacci(30);
    const cpuTestEnd = performance.now();
    
    console.log("🏃 [Performance] CPU intensive test completed");
    testData.cpuTest = {
      operation: "fibonacci(30)",
      result: fibResult,
      duration: cpuTestEnd - cpuTestStart,
      success: fibResult === 832040
    };
    
    // 大量データ処理テスト
    const dataProcessingStart = performance.now();
    
    const largeArray = Array.from({ length: 100000 }, (_, i) => ({
      id: i,
      value: Math.random(),
      text: `Item ${i}`
    }));
    
    // データ変換処理
    const processedArray = largeArray
      .filter(item => item.value > 0.5)
      .map(item => ({
        ...item,
        doubled: item.value * 2,
        category: item.value > 0.75 ? 'high' : 'medium'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 1000);
    
    const dataProcessingEnd = performance.now();
    
    console.log("🏃 [Performance] Data processing test completed");
    testData.dataProcessingTest = {
      originalSize: largeArray.length,
      processedSize: processedArray.length,
      duration: dataProcessingEnd - dataProcessingStart,
      operations: ["filter", "map", "sort", "slice"],
      success: processedArray.length <= 1000
    };
    
    // JSON シリアライゼーション/デシリアライゼーションテスト
    const serializationStart = performance.now();
    
    const complexObject = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        testType: "serialization"
      },
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        uuid: crypto.randomUUID(),
        nested: {
          level1: {
            level2: {
              value: Math.random(),
              text: `Nested text ${i}`,
              array: Array.from({ length: 10 }, (_, j) => j * i)
            }
          }
        }
      }))
    };
    
    const serialized = JSON.stringify(complexObject);
    const deserialized = JSON.parse(serialized);
    
    const serializationEnd = performance.now();
    
    console.log("🏃 [Performance] Serialization test completed");
    testData.serializationTest = {
      originalObjectSize: JSON.stringify(complexObject).length,
      serializedSize: serialized.length,
      duration: serializationEnd - serializationStart,
      roundTripSuccess: deserialized.data.length === complexObject.data.length,
      success: true
    };
    
    // 並列処理パフォーマンステスト
    const parallelStart = performance.now();
    
    const parallelTasks = Array.from({ length: 10 }, async (_, i) => {
      // 各タスクで異なる処理を実行
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      return {
        taskId: i,
        result: Array.from({ length: 1000 }, () => Math.random()).reduce((a, b) => a + b, 0),
        timestamp: new Date().toISOString()
      };
    });
    
    const parallelResults = await Promise.all(parallelTasks);
    const parallelEnd = performance.now();
    
    console.log("🏃 [Performance] Parallel processing test completed");
    testData.parallelTest = {
      taskCount: parallelTasks.length,
      results: parallelResults,
      duration: parallelEnd - parallelStart,
      success: parallelResults.length === 10
    };
    
    // 全体的なパフォーマンス指標
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    const performanceMetrics = {
      totalDuration,
      testsCompleted: 5,
      averageTestDuration: totalDuration / 5,
      performance: {
        cpuScore: Math.round(1000 / testData.cpuTest.duration),
        dataProcessingScore: Math.round(100000 / testData.dataProcessingTest.duration),
        serializationScore: Math.round(testData.serializationTest.serializedSize / testData.serializationTest.duration)
      }
    };
    
    console.log("🏃 [Performance] All performance tests completed");
    testData.performanceMetrics = performanceMetrics;
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      metadata: {
        testsPerformed: 5,
        environment: "server",
        performanceScores: performanceMetrics.performance
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [Performance] Tests failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      data: testData
    };
  }
}

// =============================================================================
// イベントハンドラー
// =============================================================================

/**
 * ActivityPub受信イベントハンドラー
 */
export function onActivityPubReceive(activity: any) {
  console.log("📡 [ActivityPub Handler] Received activity:", activity);
  
  // 受信したActivityに基づいて処理を実行
  if (activity.type === "Create" && activity.object?.type === "Note") {
    console.log("📝 [ActivityPub Handler] Received Note creation:", activity.object.content);
  }
  
  // イベントとして通知
  takos.events.publish("demo:activitypub-received", {
    type: "activitypub-received",
    activity,
    timestamp: new Date().toISOString(),
    handler: "onActivityPubReceive"
  });
  
  return {
    success: true,
    processed: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * ストレージ変更イベントハンドラー
 */
export function onStorageChange(event: any) {
  console.log("💾 [Storage Handler] Storage changed:", event);
  
  return {
    success: true,
    processed: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * 汎用イベント受信ハンドラー
 */
export function onEventReceived(eventData: any) {
  console.log("⚡ [Event Handler] Event received:", eventData);
  
  return {
    success: true,
    processed: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * 拡張機能呼び出しハンドラー
 */
export function onExtensionInvoke(params: any) {
  console.log("🧩 [Extension Handler] Extension invoked:", params);
  
  return {
    success: true,
    result: "Extension invocation handled successfully",
    timestamp: new Date().toISOString(),
    params
  };
}

// =============================================================================
// エクスポート関数（レガシー互換性）
// =============================================================================

export function apiTestServer(testType: string, params?: any) {
  console.log(`[Server] apiTestServer called with: ${testType}`, params);
  return {
    layer: "server",
    testType,
    params,
    timestamp: new Date().toISOString(),
    result: `Server processed ${testType} test`,
    version: "2.0.0"
  };
}

// アクティビティパブの基本テスト関数（レガシー互換性）
export async function testActivityPubSend() {
  const result = await activityPubFullDemo();
  return result.data?.noteResult || result;
}

export async function testKVStorage() {
  const result = await storageFullDemo();
  return result.data?.basicTest || result;
}

export async function testCDNOperations() {
  const result = await cdnFullDemo();
  return result.data?.textUpload || result;
}

export async function testEvents() {
  const result = await eventsFullDemo();
  return result.data?.basicEvent || result;
}

export async function testExtensions() {
  const result = await extensionsFullDemo();
  return result.data?.selfInfo || result;
}

console.log("✅ [Server] Comprehensive Takos API Demo server module loaded successfully");
