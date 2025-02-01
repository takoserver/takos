function createWebsocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => resolve(ws);
    ws.onerror = reject;
  });
}
