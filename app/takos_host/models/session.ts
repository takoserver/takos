import mongoose from "mongoose";

const hostSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HostUser",
    required: true,
  },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
});

const HostSession = mongoose.models.TakosHostSession ??
  mongoose.model("TakosHostSession", hostSessionSchema);

export default HostSession;
export { hostSessionSchema };
