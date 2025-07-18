import { load, type LoadOptions } from "@std/dotenv";
import { z } from "zod";
import type { Context, Hono } from "hono";

const EnvSchema = z.object({
  MONGO_URI: z.string(),
}).passthrough();

type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;
const envMap = new WeakMap<Hono, Env>();

export async function initConfig(options?: LoadOptions): Promise<Env> {
  if (!cachedEnv) {
    const loaded = await load(options);
    cachedEnv = EnvSchema.parse(loaded);
  }
  return cachedEnv;
}

export function getConfig(): Env {
  if (!cachedEnv) {
    throw new Error("initConfig() must be called first");
  }
  return cachedEnv;
}

export function initEnv(app: Hono, env: Env): void {
  envMap.set(app, env);
  app.use("*", async (c, next) => {
    (c as unknown as { set: (k: string, v: unknown) => void }).set(
      "env",
      env,
    );
    await next();
  });
}

export function getEnv(target: Hono | Context): Env {
  if ("get" in target) {
    return (target as unknown as { get: (k: string) => unknown }).get(
      "env",
    ) as Env;
  }
  return envMap.get(target as Hono) as Env;
}
