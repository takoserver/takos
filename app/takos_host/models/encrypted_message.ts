import mongoose from "mongoose";

const encryptedMessageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: [String], required: true },
  content: { type: String, required: true },
  mediaType: { type: String, default: "message/mls" },
  encoding: { type: String, default: "base64" },
  tenant_id: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
});

const EncryptedMessage = mongoose.models.EncryptedMessage ??
  mongoose.model("EncryptedMessage", encryptedMessageSchema);

export default EncryptedMessage;
export { encryptedMessageSchema };
