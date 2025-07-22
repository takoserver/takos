import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HostUser",
    required: true,
  },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
});

const HostUserSession = mongoose.models.HostUserSession ??
  mongoose.model("HostUserSession", userSessionSchema);

export default HostUserSession;
export { userSessionSchema };
