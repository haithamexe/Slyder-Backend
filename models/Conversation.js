const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: ObjectId,
      ref: "Message",
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    conversationType: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
    settings: {
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
