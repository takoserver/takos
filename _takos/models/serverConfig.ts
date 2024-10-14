import mongoose from "mongoose"

const serverConfigKeys = [
  "publicKey",
  "privateKey",
  "lastUpdateKey",
]

const serverConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, enum: serverConfigKeys },
  value: { type: String, required: true },
})

const ServerConfig = mongoose.model("ServerConfig", serverConfigSchema)

export default ServerConfig
