import mongoose from "mongoose";
import { dmMessageSchema } from "../takos/dm_message.ts";

const HostDMMessage = mongoose.models.HostDMMessage ??
  mongoose.model("HostDMMessage", dmMessageSchema, "dm_messages");

export default HostDMMessage;
export { dmMessageSchema };
