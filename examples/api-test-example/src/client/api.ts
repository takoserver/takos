// deno-lint-ignore-file no-explicit-any
const { takos } = globalThis as any;

export function clientPing(message: string) {
  return {
    layer: "client",
    message: `client pong: ${message}`,
    timestamp: new Date().toISOString(),
  };
}

export function onServerToClient(payload: any) {
  console.log("[Client] Received event from server", payload);
  takos.kv.write("lastServerEvent", payload);
  return { received: true };
}
