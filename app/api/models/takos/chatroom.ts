import mongoose from "mongoose";
import tenantScope from "../plugins/tenant_scope.ts";

// トークルームのメタデータ（owner と id のみを保持）
const chatroomSchema = new mongoose.Schema({
  owner: { type: String, required: true },
  id: { type: String, required: true },
});

chatroomSchema.plugin(tenantScope, { envKey: "ACTIVITYPUB_DOMAIN" });
chatroomSchema.index({ owner: 1, id: 1, tenant_id: 1 }, { unique: true });

const Chatroom = mongoose.models.Chatroom ??
  mongoose.model("Chatroom", chatroomSchema);

export default Chatroom;
export { chatroomSchema };
