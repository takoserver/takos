import { Hono } from "hono";
import { array, z } from "zod";
import { Singlend } from "@evex/singlend";
import registers from "./register.ts";
import { concatenateUint8Arrays } from "../../utils/connectBinary.ts";
import Session from "../../models/sessions.ts";
import User from "../../models/users.ts";
import { generateDeviceKey } from "@takos/takos-encrypt-ink";
const singlend = new Singlend();
function arrayBufferToHex(buffer: ArrayBuffer): string {
  // ArrayBufferをUint8Arrayに変換
  const byteArray = new Uint8Array(buffer);

  // 各バイトを16進数に変換し、文字列として結合
  const hexString = Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hexString;
}
function hexToArrayBuffer(hexString: string): ArrayBuffer {
  // 2文字ずつに分割して、各文字列を16進数として解析
  const byteArray = new Uint8Array(
    hexString.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
  );

  // Uint8ArrayをArrayBufferに変換して返す
  return byteArray.buffer;
}

singlend.on(
  "login",
  z.object({
    email: z.string().or(z.undefined()),
    userName: z.string().or(z.undefined()),
    password: z.string(),
  }),
  async (query, ok, error) => {
    if (!query.email && !query.userName) {
      return error({ error: "email or userName is required" });
    }
    if (!query.password) {
      return error({ error: "password is required" });
    }
    if (query.email) {
      console.log("email");
      const user = await User.findOne({ email: query.email });
      if (!user) {
        return error({ error: "user not found" });
      }
      const password = new TextEncoder().encode(query.password);
      const salt = new TextEncoder().encode(user.salt);
      const passwordHash = await crypto.subtle.digest(
        "SHA-256",
        concatenateUint8Arrays([salt, password]),
      );
      if (user.password === arrayBufferToHex(new Uint8Array(passwordHash))) {
        const sessionid = crypto.getRandomValues(new Uint8Array(16));
        const hex = Array.from(sessionid).map((b) =>
          b.toString(16).padStart(2, "0")
        ).join("");
        await Session.create({ sessionid: hex, userName: user.userName });
        return ok({ sessionid: hex });
      }
      return error({ error: "password is incorrect" });
    } else {
      const user = await User.findOne({ userName: query.userName });
      if (!user) {
        return error({ error: "user not found" });
      }
      const password = new TextEncoder().encode(query.password);
      const salt = hexToArrayBuffer(user.salt);
      const passwordHash = await crypto.subtle.digest(
        "SHA-256",
        concatenateUint8Arrays([new Uint8Array(salt), password]),
      );
      const passwordHashHex = arrayBufferToHex(passwordHash);
      if (user.password === passwordHashHex) {
        const sessionid = crypto.getRandomValues(new Uint8Array(16));
        const hex = arrayBufferToHex(sessionid);
        const deviceKey = await generateDeviceKey();
        await Session.create({
          sessionid: hex,
          userName: user.userName,
          deviceKey,
        });
        return ok({ sessionid: hex });
      }
      return error({ error: "password is incorrect" });
    }
  },
);

export default singlend;
