const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const notificationSchema = mongoose.Schema(
  {
    receiver: {
      type: ObjectId,
      ref: "User",
    },
    sender: {
      type: ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
    post: {
      type: ObjectId,
      ref: "Post",
    },
    message: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
