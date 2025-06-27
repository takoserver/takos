const { takos } = globalThis as any;

// Request/response API example for server layer
takos.events.onRequest<{ text: string }, { text: string }>(
  "pingServer",
  ({ text }) => ({ text: text + " from server" }),
);

export async function requestClientPing(text: string) {
  return await takos.events.request<{ text: string }, { text: string }>(
    "pingClient",
    { text },
  );
}
