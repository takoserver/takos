import { Singlend } from "@evex/singlend";
import z from "zod";
import User from "../../models/users.ts";
import Session from "../../models/sessions.ts";
import KeyShareData from "../../models/keyShareData.ts";

const singlend = new Singlend();

singlend.group(
  z.object({
    sessionid: z.string(),
  }),
  async (query, next, error) => {
    const user = await Session.findOne({ sessionid: query.sessionid });
    if (!user) {
      return error("error");
    }
    const userInfo = await User.findOne({ userName: user.userName });
    if (!userInfo) {
      return error("error");
    }
    return next({ userInfo: userInfo, sessionInfo: user });
  },
  (singlend) =>
    singlend.on(
      "getSessionInfo",
      z.object({
      }),
      async (query, value, ok) => {
        const SharedData = await KeyShareData.find({
          sessionid: value.sessionInfo.sessionid,
        })
        return ok({
          setuped: value.userInfo.setup,
          sessionEncrypted: value.sessionInfo.encrypted,
          sharedDataIds: SharedData.map((data) => data.id)
        });
      },
    ).on(
      "setUp",
      z.object({
        sessionid: z.string(),
        masterKey: z.string(),
        identityKey: z.string(),
        accountKey: z.string(),
        nickName: z.string(),
        icon: z.string(),
        birthday: z.string(),
        keyShareKey: z.string(),
        keyShareSignKey: z.string(),
      }),
      async (query, value, ok) => {
        return ok("ok");
      }
    )
)

export default singlend;