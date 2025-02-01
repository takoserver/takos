import { signData } from "@takos/takos-encrypt-ink";
import serverKey from "../models/serverKeys.ts";
import { load } from "@std/dotenv";

const env = await load();



export async function fff(
  path: string,
  body: string,
  domains: string[],
): Promise<Response[] | { error: string }> {
  //「fff」 means foundation fetch function
  const latestServerKey = await serverKey.findOne({}).sort({ expires: -1 });
  if (!latestServerKey) {
    return { error: "Invalid Authorization" };
  }
  const sign = signData(body, latestServerKey.private);
  const domain = env["domain"]?.toString().trim();
  if (!domain) {
    throw new Error("Environment variable 'domain' is missing or invalid.");
  }
  const expires = latestServerKey.expire.toISOString();
  if (!expires) {
    throw new Error("Server key expiration date is missing or invalid.");
  }

  const authorizationHeader = `Signature sign="${sign.trim()}",expires="${expires}",domain="${domain}"`;

  const responsArray = [];
  for (const domain of domains) {
    const res = fetch(`https://${domain}/${path}`, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader,
        "Content-Type": "application/json",
      },
      body,
    });
    responsArray.push(res);
  }
  const resolvedResponses = await Promise.all(responsArray);
  return resolvedResponses;
}