import mongoose from "mongoose";

/**
 * FASP 設定を保持するスキーマ。
 * docs/FASP.md 7.1 の設定例に基づき base_url や capability を保存する。
 * capabilities の仕様は FASP General provider_info に準拠する。
 */
const faspConfigSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  base_url: { type: String, default: "" },
  capabilities: {
    data_sharing: { type: String, default: "" },
    trends: { type: String, default: "" },
    account_search: { type: String, default: "" },
  },
  tenant_id: { type: String, index: true },
});

const HostFaspConfig = mongoose.models.HostFaspConfig ??
  mongoose.model("HostFaspConfig", faspConfigSchema);

export default HostFaspConfig;
export { faspConfigSchema };
