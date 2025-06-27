const { takos } = globalThis as any;

takos.events.onRequest("pluginServerPing", ({ text }: { text: string }) => {
  return { text: text + " from plugin server" };
});

export async function requestPluginPing() {
  return await takos.events.request("pluginPing");
}
