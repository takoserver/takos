// Client layer API using new takos.events system
const { takos } = globalThis as any;

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
