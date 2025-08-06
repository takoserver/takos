import mongoose from "mongoose";

/**
 * FASP 登録情報を保持するスキーマ。
 * docs/FASP.md 4.1 の登録フローで交換する情報を保存する。
 */
const faspRegistrationSchema = new mongoose.Schema({
  fasp_id: { type: String, index: true },
  name: { type: String },
  base_url: { type: String },
  server_id: { type: String, index: true },
  public_key: { type: String },
  private_key: { type: String },
  our_public_key: { type: String },
  approved: { type: Boolean, default: false },
  capabilities: [{ id: String, version: String }],
  tenant_id: { type: String, index: true },
});

const HostFaspRegistration = mongoose.models.HostFaspRegistration ??
  mongoose.model("HostFaspRegistration", faspRegistrationSchema);

export default HostFaspRegistration;
export { faspRegistrationSchema };
