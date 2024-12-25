import { Hono } from "hono";

type Env = {
  MY_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

export default app;
