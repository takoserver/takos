import { Hono } from "hono";
import { array, z } from "zod";
import { Singlend } from "@evex/singlend";
import { cors } from "hono/cors";
const app = new Hono();
const singlend = new Singlend();
app.use("/",cors({origin: "*",allowMethods: ["GET", "POST", "PUT", "DELETE"],},),);
app.post("/", singlend.handler());
export default app;