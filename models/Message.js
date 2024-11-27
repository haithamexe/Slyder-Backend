const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
const Conversation = require("./Conversation");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      default: "text",
    },
    status: {
      type: String,
      enum: ["sent", "seen"],
      default: "sent",
    },
    visibleFor: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "document"],
      default: "text",
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1 });

// messageSchema.post("save", async function (doc) {
//   await Conversation.findByIdAndUpdate(doc.conversation, {
//     lastMessage: doc._id,
//     lastMessageTime: doc.createdAt,
//   });
// });

// messageSchema.post("save", async function (doc) {
//   if (doc.visibleFor.length === 0) {
//     await doc.deleteOne();
//     await Conversation.findByIdAndUpdate(doc.conversation, {
//       $pull: { messages: doc._id },
//     });
//   }
// });

// messageSchema.post("update", async function (doc) {
//   if (doc.visibleFor.length === 0) {
//     await doc.deleteOne();
//     await Conversation.findByIdAndUpdate(doc.conversation, {
//       $pull: { messages: doc._id },
//     });
//   }
// });

// messageSchema.post("save", async function (doc) {
//   if (doc.deletedFor.length === 2) {
//     await doc.deleteOne();
//   }
// });

// messageSchema.post("remove", async function (doc) {
//   await Conversation.findByIdAndUpdate(doc.conversation, {
//     lastMessage: null,
//     lastMessageTime: null,
//   });
// });

// messageSchema.post("save", async function (doc) {
//   if (doc.deletedFor.length === 2) {
//     await doc.deleteOne();
//   }
// });

module.exports = mongoose.model("Message", messageSchema);
