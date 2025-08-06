import mongoose from "mongoose";

/**
 * FASP data sharing の backfill request スキーマ。
 * docs/FASP.md 3章および docs/fasp/discovery/data_sharing/v0.1 に基づき保存。
 */
const faspBackfillRequestSchema = new mongoose.Schema({
  server_id: { type: String, index: true },
  category: { type: String },
  max_count: { type: Number },
  more_objects_available: { type: Boolean, default: true },
  tenant_id: { type: String, index: true },
});

const HostFaspBackfillRequest = mongoose.models.HostFaspBackfillRequest ??
  mongoose.model("HostFaspBackfillRequest", faspBackfillRequestSchema);

export default HostFaspBackfillRequest;
