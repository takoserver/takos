import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
  tenant_id: { type: String, index: true },
});

const HostSession = mongoose.models.HostSession ??
  mongoose.model("HostSession", sessionSchema);

export default HostSession;
export { sessionSchema };
