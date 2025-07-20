export async function verifyRecaptchaV3(
  token: string | undefined,
  secret: string,
  action: string,
  threshold = 0.5,
): Promise<boolean> {
  if (!secret || !token) return false;
  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);
  const res = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      body: params,
    },
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data.success && data.action === action && data.score >= threshold;
}

export async function verifyRecaptchaV2(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!secret || !token) return false;
  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);
  const res = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      body: params,
    },
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data.success;
}
