import mongoose from "mongoose";

const relayEdgeSchema = new mongoose.Schema({
  tenant_id: { type: String, required: true },
  relay: { type: String, required: true },
  mode: { type: String, enum: ["pull", "push"], default: "pull" },
  since: { type: Date, default: Date.now },
});

relayEdgeSchema.index({ relay: 1, tenant_id: 1 });

const RelayEdge = mongoose.model("RelayEdge", relayEdgeSchema, "relay_edge");

export default RelayEdge;
export { relayEdgeSchema };
