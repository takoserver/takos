// Client layer API using new takos.events system
const { takos } = globalThis as any;

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export function onUiToClient(payload: unknown) {
  console.log("[Client] Received event from UI:", payload);

  try {
    return {
      received: true,
      processedBy: "client",
      originalPayload: payload,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Client] Error handling UI event:", error);
    return {
      received: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

export function onServerToClient(payload: unknown) {
  console.log("[Client] Received event from server:", payload);

  try {
    return {
      received: true,
      processedBy: "client",
      originalPayload: payload,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Client] Error handling server event:", error);
    return {
      received: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

export function onTestEvent(payload: unknown) {
  console.log("[Client] onTestEvent called:", payload);

  try {
    return {
      received: true,
      processedBy: "client",
      originalPayload: payload,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Client] Error in onTestEvent:", error);
    return {
      received: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

// Request/response API example
takos.events.onRequest<{ text: string }, { text: string }>(
  "echoFromClient",
  ({ text }) => ({ text: text + " from client" }),
);

export async function requestServerEcho(text: string) {
  return await takos.events.request<{ text: string }, { text: string }>(
    "echoFromServer",
    { text },
  );
}

// =============================================================================
// Client API Test Functions
// =============================================================================

export function apiTestClient(testType: string, params?: any) {
  console.log(`[Client] apiTestClient called with: ${testType}`, params);
  return {
    layer: "client",
    testType,
    params,
    timestamp: new Date().toISOString(),
    result: `Client processed ${testType} test`,
  };
}

export async function testClientKV() {
  try {
    const testKey = "client_test_key_" + Date.now();
    const testValue = {
      message: "Hello from client KV!",
      timestamp: new Date().toISOString(),
    };

    await takos.kv.write(testKey, testValue);
    const readValue = await takos.kv.read(testKey);
    const keys = await takos.kv.list();

    return {
      success: true,
      written: testValue,
      read: readValue,
      keysCount: keys.length,
      testKey,
      note: "Client KV storage is isolated from server",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Client] KV operations error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

export async function testClientEvents() {
  try {
    await takos.events.publish("clientToServer", {
      message: "Hello from client to server!",
      timestamp: new Date().toISOString(),
    });

    await takos.events.publish("clientToUI", {
      message: "Hello from client to UI!",
      timestamp: new Date().toISOString(),
    });

    await takos.events.publish("testEvent", {
      source: "client",
      message: "Test event from client",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Events sent to server, UI, and test event fired",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Client] Events API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

export function testClientExtensions() {
  try {
    const allExtensions = takos.extensions.all;
    return {
      success: true,
      totalExtensions: allExtensions.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Client] Extensions API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

export async function testClientFetch() {
  try {
    const response = await takos.fetch(
      "https://jsonplaceholder.typicode.com/todos/1",
    );
    const data = await response.json();
    return {
      success: true,
      status: response.status,
      data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Client] Fetch API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

export async function runClientTests() {
  const results: Record<string, TestResult> = {};

  try {
    results.kv = { success: true, data: await testClientKV(), timestamp: new Date().toISOString() };
  } catch (error) {
    results.kv = { success: false, error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() };
  }

  try {
    results.events = { success: true, data: await testClientEvents(), timestamp: new Date().toISOString() };
  } catch (error) {
    results.events = { success: false, error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() };
  }

  try {
    results.extensions = { success: true, data: testClientExtensions(), timestamp: new Date().toISOString() };
  } catch (error) {
    results.extensions = { success: false, error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() };
  }

  try {
    results.fetch = { success: true, data: await testClientFetch(), timestamp: new Date().toISOString() };
  } catch (error) {
    results.fetch = { success: false, error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() };
  }

  const summary = {
    total: Object.keys(results).length,
    passed: Object.values(results).filter((r) => r.success).length,
    failed: Object.values(results).filter((r) => !r.success).length,
    timestamp: new Date().toISOString(),
  };

  return {
    success: true,
    summary,
    results,
    message: `Client tests completed: ${summary.passed}/${summary.total} passed`,
  };
}
