import mongoose from "mongoose";

/** FASP登録情報と機能状態を保持するスキーマ */
const capabilitySchema = new mongoose.Schema({
  identifier: { type: String, required: true },
  version: { type: String, required: true },
  enabled: { type: Boolean, default: false },
});

const eventSubscriptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  category: { type: String, required: true },
  subscriptionType: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const backfillRequestSchema = new mongoose.Schema({
  id: { type: String, required: true },
  category: { type: String, required: true },
  maxCount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  created_at: { type: Date, default: Date.now },
});

const communicationLogSchema = new mongoose.Schema({
  direction: { type: String, enum: ["in", "out"], required: true },
  endpoint: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now },
});

const faspSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  baseUrl: { type: String, required: true },
  serverId: { type: String, required: true },
  faspPublicKey: { type: String, required: true },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
  accepted: { type: Boolean, default: false },
  capabilities: { type: [capabilitySchema], default: [] },
  eventSubscriptions: { type: [eventSubscriptionSchema], default: [] },
  backfillRequests: { type: [backfillRequestSchema], default: [] },
  communications: { type: [communicationLogSchema], default: [] },
  created_at: { type: Date, default: Date.now },
});

const Fasp = mongoose.models.Fasp ?? mongoose.model("Fasp", faspSchema);

export default Fasp;
export {
  backfillRequestSchema,
  capabilitySchema,
  communicationLogSchema,
  eventSubscriptionSchema,
  faspSchema,
};
