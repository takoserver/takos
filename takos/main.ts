import { Hono } from "hono";
import sessions from "./web/sessions.ts"
import profile from "./web/profile.ts"
import keys from "./web/keys.ts"

const app = new Hono();
app.route("sessions", sessions);
app.route("profile", profile);
app.route("keys", keys);

export default app;
