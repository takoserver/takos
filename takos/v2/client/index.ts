// books.ts
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import ping from "@/v2/client/ping.ts";
import bgimage from "@/v2/client/bgimage.ts";
import temp from "@/v2/client/sessions/registers/temp.ts";
import check from "@/v2/client/sessions/registers/check.ts";
import recaptcha from "@/v2/client/recaptcha.ts";
import auth from "@/v2/client/sessions/registers/auth.ts";
import icon from "@/v2/client/profile/icon.ts";
import userName from "@/v2/client/profile/userName.ts";
import profile from "@/v2/client/profile/profile.ts";
import nickName from "@/v2/client/profile/nickName.ts";
import login from "@/v2/client/sessions/login.ts";
import logout from "@/v2/client/sessions/logout.ts";
import setup from "@/v2/client/sessions/registers/setup.ts";

const app = new Hono();

app.use(bodyLimit({
  maxSize: 100 * 1024,
})).route("/ping", ping);
app.route("/bgimage", bgimage);
app.route("/sessions/registers/temp", temp);
app.route("/sessions/registers/check", check);
app.route("/sessions/registers/auth", auth);
app.route("/recaptcha", recaptcha);
app.route("/profile/icon", icon);
app.route("/profile/userName", userName);
app.route("/profile/nickName", nickName);
app.route("/profile", profile);
app.route("/sessions/login", login);
app.route("/sessions/logout", logout);
app.route("/sessions/registers/setup", setup);
export default app;
