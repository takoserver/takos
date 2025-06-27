const { takos } = globalThis as any;

// Simple request/response handler
takos.events.onRequest("pluginPing", () => "pong from plugin");

export async function requestServerPing(text: string) {
  return await takos.events.request("pluginServerPing", { text });
}
