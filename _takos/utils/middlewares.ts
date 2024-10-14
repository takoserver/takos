import type { Context } from "hono"
import { getPrivateKey, importCryptoKey, signData, verifySignature } from "@/utils/takosSign.ts"
export const takosSign = async (c: Context, next: any) => {
  const method = c.req.method
  const url = c.req.path
  console.log(url)
  if (method !== "POST") {
    if (url === "/takos/v2/server/ping" || url === "/takos/v2/server/pubkey") {
      console.log("middleware 1 end")
      await next()
      return
    }
    return c.json({
      status: 200,
      message: "Only POST method is allowed",
    })
  }
  // verify the request
  const body = await c.req.json()
  const pubkey = await fetch(`https://${body.server}/takos/v2/server/pubkey`)
    .then((res) => {
      if (res.status !== 200) {
        c.json({
          status: 200,
          message: "Failed to get pubkey",
        })
      }
      return res.json()
    })
    .then((res) => res.pubkey)
  const isValid = verifySignature(
    await importCryptoKey(JSON.stringify(pubkey), ["verify"]),
    body.signature,
    body.data,
  )
  if (!isValid) {
    return c.json({
      status: 200,
      message: "Invalid signature",
    })
  }
  await next()
  // sign and send the
  const response = c.res.body
  const privateKey = await getPrivateKey()
  const signature = await signData(JSON.stringify(response), privateKey)
  c.json({
    status: 200,
    signature,
    data: JSON.stringify(response),
  })
}
