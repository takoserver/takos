import { Takos } from "./packages/builder/src/classes.ts";

/**
 * @event send-message
 */
function sendMessage(...args: unknown[]) {
  const text = args[0] as string;
  console.log(`Sending: ${text}`);
}

/**
 * @event receive-message  
 */
function receiveMessage(...args: unknown[]) {
  const text = args[0] as string;
  console.log(`Received: ${text}`);
}

// テスト用のTakosインスタンス（チェーン形式）
const takos = Takos.create()
  .server("send-message", sendMessage)
  .server("receive-message", receiveMessage);

export { takos };
