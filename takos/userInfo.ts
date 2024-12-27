import { Context, Next } from "hono";
import { Hono } from "hono";
import User from "./models/users.ts";
import Session from "./models/sessions.ts";
import { sessionSchema } from "./models/sessions.ts";
import { Env } from "./_factory.ts";
import { userSchema } from "./models/users.ts";
import {  InferSchemaType } from 'mongoose'

type userType = InferSchemaType<typeof userSchema>
type SessionType = InferSchemaType<typeof sessionSchema>

export type MyEnv = {
  Variables: {
    // Define the key's name and expected type
    user: userType
    session: SessionType
  }
  Bindings: Env
}

// Authorization ヘッダーをコンテキストに入れるミドルウェア
export const authorizationMiddleware = async (c: Context<MyEnv>, next: Next) => {
  // "Authorization" ヘッダーを取得
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const session = await Session.findOne({ sessionid: authHeader });
  if (!session) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const userInfo = await User.findOne({ userName: session.userName });
  if (!userInfo) {
    return c.json({ message: "server error" }, 500);
  }
  c.set("user", userInfo);
  c.set("session", session);
  // 次の処理へ
  await next();
};


const app = new Hono<MyEnv>();
app.use("*",authorizationMiddleware);


export default app;