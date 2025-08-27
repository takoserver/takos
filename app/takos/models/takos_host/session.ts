import mongoose from "mongoose";
import { sessionSchema } from "../takos/session.ts";

const HostSession = mongoose.models.HostSession ??
  mongoose.model("HostSession", sessionSchema, "sessions");

export default HostSession;
export { sessionSchema };
