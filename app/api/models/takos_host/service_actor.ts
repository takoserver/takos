import mongoose from "mongoose";

const serviceActorSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
  actorUrl: { type: String, required: true },
  type: { type: String, default: "Service" },
  deliverBatchSize: { type: Number, default: 20 },
  deliverMinIntervalMs: { type: Number, default: 200 },
  allowInstances: { type: [String], default: ["*"] },
  denyInstances: { type: [String], default: [] },
  followers: { type: [String], default: [] },
});

const HostServiceActor = mongoose.models.HostServiceActor ??
  mongoose.model("HostServiceActor", serviceActorSchema);

export default HostServiceActor;
export { serviceActorSchema };
