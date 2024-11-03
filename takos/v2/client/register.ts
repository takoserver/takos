import { z } from "zod";
import { Singlend } from "@evex/singlend";
import { checkRecapcha } from "../../utils/checkRecapcha.ts";
import { sendMail } from "../../utils/sendEmail.ts";
import tempUsers from "../../models/tempUsers.ts";
import { concatenateUint8Arrays } from "../../utils/connectBinary.ts";
import users from "../../models/users.ts";
import {
  checkNickName,
  checkPassword,
  checkUserName,
} from "../../utils/checks.ts";
const singlend = new Singlend();
singlend.group(
  z.object({
    recapcha: z.string(),
    recapchaVersion: z.string(),
  }),
  async (query, next, error) => {
    if (query.recapchaVersion !== "v2" && query.recapchaVersion !== "v3") {
      return error("error");
    }
    if (await checkRecapcha(query.recapcha, query.recapchaVersion)) {
      return next({});
    }
    return error("error");
  },
  (singlend) =>
    singlend.on(
      "tempRegister",
      z.object({
        email: z.string(),
      }),
      async (query, value, ok) => {
        const code = generateRandomSixDigit();
        sendMail(
          query.email,
          "Takos Registration",
          `Your registration code is ${code}`,
        );
        const sessionid = crypto.getRandomValues(new Uint32Array(1))[0]
          .toString(16);
        const alerdyUser = await tempUsers.findOne({ email: query.email });
        if (alerdyUser) {
          await tempUsers.deleteOne({
            email: query.email,
          });
        }
        const res = await tempUsers.create({
          email: query.email,
          checkCode: code,
          token: sessionid,
        });
        console.log("alerdyUser");
        console.log(res);
        return ok({ sessionid: sessionid });
      },
    ),
);

singlend.on(
  "checkCode",
  z.object({
    sessionid: z.string(),
    code: z.string(),
  }),
  async (query, ok, error) => {
    const user = await tempUsers.findOne({ token: query.sessionid });
    if (!user) {
      return error("error", 400);
    }
    if (user.checkCode === Number(query.code) && !user.checked) {
      await tempUsers.updateOne({ token: query.sessionid }, { checked: true });
      console.log("ok");
      return ok("ok");
    }
    await tempUsers.updateOne({ token: query.sessionid }, {
      missCheck: user.missCheck + 1,
    });
    return error("error", 400);
  },
).on(
  "register",
  z.object({
    sessionid: z.string(),
    password: z.string(),
    userName: z.string(),
  }),
  async (query, ok, error) => {
    const user = await tempUsers.findOne({ token: query.sessionid });
    if (!user) {
      return ok("error");
    }
    if (user.checked) {
      if (!checkUserName(query.userName) && !checkPassword(query.password)) {
        console.log("ok");
        return error("error", 400);
      }
      const salt = generateRandomSalt();
      const password = new TextEncoder().encode(query.password);
      const passwordHash = await crypto.subtle.digest(
        "SHA-256",
        concatenateUint8Arrays([salt, password]),
      );
      const passwordHashHex = arrayBufferToHex(passwordHash);
      await users.create({
        email: user.email,
        password: passwordHashHex,
        salt: arrayBufferToHex(salt),
        userName: query.userName,
      });
      return ok("ok");
    }
    return error("error", 403);
  },
);

export default singlend;
function generateRandomSalt() {
  const salt = new Uint8Array(16); // 128ビット = 16バイト
  crypto.getRandomValues(salt);
  return salt;
}
function generateRandomSixDigit() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);

  // 6桁の数字に変換し、先頭に0が来ないように100000から999999の範囲に調整します。
  const randomNumber = array[0] % 900000 + 100000;
  return randomNumber;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  // ArrayBufferをUint8Arrayに変換
  const byteArray = new Uint8Array(buffer);

  // 各バイトを16進数に変換し、文字列として結合
  const hexString = Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hexString;
}
