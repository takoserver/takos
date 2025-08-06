import mongoose from "mongoose";

/**
 * FASP data sharing の event subscription スキーマ。
 * docs/FASP.md 3章および docs/fasp/discovery/data_sharing/v0.1 に基づき保存。
 */
const faspEventSubscriptionSchema = new mongoose.Schema({
  server_id: { type: String, index: true },
  category: { type: String },
  subscription_type: { type: String },
  max_batch_size: { type: Number },
  threshold: {
    timeframe: Number,
    shares: Number,
    likes: Number,
    replies: Number,
  },
  tenant_id: { type: String, index: true },
});

const HostFaspEventSubscription = mongoose.models.HostFaspEventSubscription ??
  mongoose.model("HostFaspEventSubscription", faspEventSubscriptionSchema);

export default HostFaspEventSubscription;
