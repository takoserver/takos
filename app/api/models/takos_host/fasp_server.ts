import mongoose from "mongoose";

const faspServerSchema = new mongoose.Schema({
  serverId: { type: String, required: true },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
});

const HostFaspServer = mongoose.models.HostFaspServer ??
  mongoose.model("HostFaspServer", faspServerSchema);

export default HostFaspServer;
