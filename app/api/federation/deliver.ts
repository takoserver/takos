export async function deliverToRecipients(_args: {
  activity: unknown;
  to: string[];
  cc?: string[];
  bto?: string[];
  bcc?: string[];
}) {
  // ここで HTTP 署名・inbox 配送を実施（既存の配送ロジックに委譲）
}
