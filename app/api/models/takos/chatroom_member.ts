import mongoose from "mongoose";
import tenantScope from "../plugins/tenant_scope.ts";

const chatroomMemberSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  member: { type: String, required: true },
  status: { type: String, enum: ["joined", "invited"], required: true },
});

chatroomMemberSchema.plugin(tenantScope, { envKey: "ACTIVITYPUB_DOMAIN" });
chatroomMemberSchema.index({ member: 1, roomId: 1, tenant_id: 1 }, {
  unique: true,
});

const ChatroomMember = mongoose.models.ChatroomMember ??
  mongoose.model("ChatroomMember", chatroomMemberSchema);

export default ChatroomMember;
export { chatroomMemberSchema };
