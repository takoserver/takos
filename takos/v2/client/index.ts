// books.ts
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import ping from "./ping.ts";
import bgimage from "./bgimage.ts";
import temp from "./sessions/registers/temp.ts";
import check from "./sessions/registers/check.ts";
import csrftoken from "./csrftoken.ts";
import recaptcha from "./recaptcha.ts";

const app = new Hono();

app.use(bodyLimit({
  maxSize: 100 * 1024,
})).route("/ping", ping);
app.route("/bgimage", bgimage);
app.route("/csrftoken", csrftoken);
app.route("/sessions/registers/temp", temp);
app.route("/sessions/registers/check", check);
app.route("/recaptcha", recaptcha);
export default app;
