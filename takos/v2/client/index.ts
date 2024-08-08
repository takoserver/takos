// books.ts
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import ping from "./ping.ts";
import bgimage from "./bgimage.ts";
import temp from "./sessions/registers/temp.ts";
import check from "./sessions/registers/check.ts";
import csrftoken from "./csrftoken.ts";
import recaptcha from "./recaptcha.ts";
import auth from "./sessions/registers/auth.ts";
import icon from "./profile/icon.ts";
import userName from "./profile/userName.ts";
import profile from "./profile/profile.ts";
import nickName from "./profile/nickName.ts";

const app = new Hono();

app.use(bodyLimit({
  maxSize: 100 * 1024,
})).route("/ping", ping);
app.route("/bgimage", bgimage);
app.route("/csrftoken", csrftoken);
app.route("/sessions/registers/temp", temp);
app.route("/sessions/registers/check", check);
app.route("/sessions/registers/auth", auth);
app.route("/recaptcha", recaptcha);
app.route("/profile/icon", icon);
app.route("/profile/userName", userName);
app.route("/profile/nickName", nickName);
app.route("/profile", profile);
export default app;
