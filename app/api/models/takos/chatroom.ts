import mongoose from "mongoose";
import tenantScope from "../plugins/tenant_scope.ts";

// MLS の暗号状態はクライアントで管理し、サーバーでは保持しない
// このコレクションはメタデータの補完用であり、存在しなくても
// 暗号化メッセージから参加メンバーを推測してトークを表示できる
// サーバーは name / icon といった最小限のメタ情報を保持する
// （参加者は暗号化メッセージ履歴から推測 / クライアント側管理）
const chatroomSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  id: { type: String, required: true },
  name: { type: String, default: "" },
  icon: { type: String, default: "" },
});

chatroomSchema.plugin(tenantScope, { envKey: "ACTIVITYPUB_DOMAIN" });
chatroomSchema.index({ userName: 1, id: 1, tenant_id: 1 }, { unique: true });

const Chatroom = mongoose.models.Chatroom ??
  mongoose.model("Chatroom", chatroomSchema);

export default Chatroom;
export { chatroomSchema };
