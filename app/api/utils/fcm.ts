export async function sendFCM(
  serverKey: string,
  token: string,
  data: Record<string, unknown>,
): Promise<void> {
  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify({ to: token, data }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("FCM push failed", res.status, text);
  }
}
