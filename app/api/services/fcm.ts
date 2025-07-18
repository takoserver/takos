import admin from "firebase-admin";
import FcmTokenRepository from "../repositories/fcm_token_repository.ts";

const repo = new FcmTokenRepository();

let initialized = false;

function init(env: Record<string, string>) {
  if (initialized) return;
  const saKeys = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
  ];
  if (!saKeys.every((k) => env[k])) return;
  const cred = {
    type: "service_account",
    project_id: env["FIREBASE_PROJECT_ID"],
    client_email: env["FIREBASE_CLIENT_EMAIL"],
    private_key: env["FIREBASE_PRIVATE_KEY"],
  };
  admin.initializeApp({ credential: admin.credential.cert(cred) });
  initialized = true;
}

export async function registerToken(
  token: string,
  userName: string,
  env: Record<string, string>,
) {
  init(env);
  await repo.updateOne(
    { token, tenant_id: env["ACTIVITYPUB_DOMAIN"] },
    { token, userName },
    { upsert: true },
  );
}

export async function unregisterToken(
  token: string,
  env: Record<string, string>,
) {
  await repo.delete({ token, tenant_id: env["ACTIVITYPUB_DOMAIN"] });
}

export async function sendNotification(
  title: string,
  body: string,
  env: Record<string, string>,
) {
  init(env);
  if (!initialized) return;
  const list = await repo.find({ tenant_id: env["ACTIVITYPUB_DOMAIN"] }) as {
    token: string;
  }[];
  const tokens: string[] = list.map((t: { token: string }) => t.token);
  if (tokens.length === 0) return;
  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
  });
}
