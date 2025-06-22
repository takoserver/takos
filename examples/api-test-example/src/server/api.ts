// deno-lint-ignore-file no-explicit-any
const { takos } = globalThis as any;

export function ping(message: string) {
  return {
    layer: "server",
    message: `pong: ${message}`,
    timestamp: new Date().toISOString(),
  };
}

export async function saveKV(key: string, value: unknown) {
  await takos.kv.write(key, value);
  return { saved: true };
}

export async function readKV(key: string) {
  return await takos.kv.read(key);
}

export async function sendActivity(note: string) {
  await takos.activitypub.send({
    type: "Note",
    content: note,
  });
  return { sent: true };
}

export async function publishToClient(message: string) {
  await takos.events.publish("serverToClient", { message, timestamp: new Date().toISOString() });
  return { status: "sent" };
}
