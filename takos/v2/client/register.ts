import { z } from "zod";
import { Singlend } from "@evex/singlend";
import { checkRecapcha } from "../../utils/checkRecapcha.ts";
import { sendMail } from "../../utils/sendEmail.ts";
import tempUsers from "../../models/tempUsers.ts";
import {  concatenateUint8Arrays  } from "../../utils/connectBinary.ts"
const singlend = new Singlend();
singlend.group(
  z.object({
    recapcha: z.string(),
    recapchaVersion: z.string(),
  }),
  async (query, next, error) => {
    if(query.recapchaVersion !== "v2" && query.recapchaVersion !== "v3"){
      return error("error")
    }
    if(await checkRecapcha(query.recapcha, query.recapchaVersion)){
      return next({})
    }
    return error("error")
  },
  (singlend) =>
    singlend.on(
      "tempRegister",
      z.object({
        email: z.string()
      }),
      async (query, value, ok) => {
        const code = generateRandomSixDigit();
        sendMail(query.email, "Takos Registration", `Your registration code is ${code}`);
        const sessionid = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
        await tempUsers.create({
            email: query.email,
            checkCode: code,
            token: sessionid
        });
        return ok({sessionid: sessionid});
      }
    ).on(
        "checkCode",
        z.object({
            sessionid: z.string(),
            code: z.string()
        }),
        async (query, _value, ok,error) => {
            const user = await tempUsers.findOne({token: query.sessionid});
            if(!user){
                return ok("error")
            }
            if(user.checkCode === Number(query.code) && !user.checked){
                tempUsers.updateOne({token: query.sessionid}, {checked: true});
                return ok("ok")
            }
            return error("error", 400)
        }
    ).on(
        "register",
        z.object({
            sessionid: z.string(),
            password: z.string(),
            userName: z.string()
        }),
        async (query, _value, ok,error) => {
            const user = await tempUsers.findOne({token: query.sessionid});
            if(!user){
                return ok("error")
            }
            if(user.checked){
                const salt = generateRandomSalt();
                const password = new TextEncoder().encode(query.password);
                const passwordHash = await crypto.subtle.digest("SHA-256",
                    concatenateUint8Arrays([salt, password])
                )
                const passwordHashHex = arrayBufferToHex(passwordHash);
                
            }
        }
    )
)

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
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  
    return hexString;
}