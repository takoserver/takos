import monngose from "mongoose"

const allowKeySchema = new monngose.Schema({
  userName: {
    type: String,
    required: true,
  },
  key: {
    type: {
      allowedUserId: {
        type: String,
        required: true,
      },
      keyHash: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
        enum: ["allow", "recognition"],
      },
    },
    required: true,
  },
  sign: {
    type: Object,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  deliveryedSessionId: {
    type: Array,
    required: true,
    default: [],
  },
})
const AllowKey = monngose.model("AllowKey", allowKeySchema)
export default AllowKey