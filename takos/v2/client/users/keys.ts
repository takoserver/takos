import { type Context, Hono } from "hono";
import Keys from "@/models/keys/keys.ts";
import User from "@/models/users.ts";
import { cors } from 'hono/cors'

const app = new Hono();

app.use("/", cors({
  origin: "*",
  allowMethods: ["GET"],
}));

app.get("/:userName", async (c: Context) => {
  const userName = c.req.param("userName");
  const user = await User.findOne(
    { userName },
  );
  if (!user) {
    return c.json({ status: false, message: "User not found" }, 404);
  }
  const keys = await Keys.find(
    { userName },
  );
  const identityAndAccountKeys = keys.map((key) => {
    return {
      identityKey: key.identityKeyPub,
      accountKey: key.accountKeyPub,
      timestamp: key.timestamp,
      hashHex: key.hashHex,
    };
  }).sort((a, b) => {
    return Number(new Date(a.timestamp)) - Number(new Date(b.timestamp));
  });
  return c.json({ status: true, keys: {
    identityAndAccountKeys,
  },
  masterKey: user.masterKey
});
});

export default app;