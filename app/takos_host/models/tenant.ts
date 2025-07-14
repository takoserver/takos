import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  domain: { type: String, required: true },
});

const Tenant = mongoose.model("Tenant", tenantSchema);

export default Tenant;
export { tenantSchema };
