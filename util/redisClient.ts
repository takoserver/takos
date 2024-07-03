import redis from "redis"
import { load } from "$std/dotenv/mod.ts"
const env = await load()
const redisURL = env["REDIS_URL"]
const pubClient = redis.createClient({
  url: redisURL,
})
await pubClient.connect()
export default pubClient
