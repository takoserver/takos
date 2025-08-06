import mongoose from "mongoose";

// Service Actor 用の鍵を保存するスキーマ。
const serviceActorKeySchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true },
  privateKey: { type: String, required: true },
  publicKey: { type: String, required: true },
});

const ServiceActorKey = mongoose.models.ServiceActorKey ??
  mongoose.model("ServiceActorKey", serviceActorKeySchema, "service_actor_key");

export default ServiceActorKey;
export { serviceActorKeySchema };
