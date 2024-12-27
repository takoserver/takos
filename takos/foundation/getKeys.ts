import app from "../_factory.ts";
import User from "../models/users.ts";

app.get("getKeys", async (c) => {
    const userName = c.req.param("userName");
    if (!userName) {
        return c.json({ message: "Unauthorized" }, 401);
    }
    const userInfo = await User.findOne({
        userName
    });
    if (!userInfo) {
        return c.json({ message: "Unauthorized" }, 401);
    }
    return c.json({
        accountKey: userInfo.accountKey,
        signature: userInfo.accountKeySign
    })
});