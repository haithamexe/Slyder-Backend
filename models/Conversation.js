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
    messages: [
      {
        type: ObjectId,
        ref: "Message",
        default: [],
      },
    ],
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
    visibleFor: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

//less efficient

// conversationSchema.post("save", async function (doc) {
//   if (doc.messages.length > 0) {
//     doc.lastMessage = doc.messages[doc.messages.length - 1];
//     await doc.save();
//   }
// });

// conversationSchema.post("save", async function (doc) {
//   if (doc.visibleFor.length === 0) {
//     await doc.deleteOne();
//   }
// });

// conversationSchema.post("save", function (next) {
//   if (this.messages.length > 0) {
//     this.lastMessage = this.messages[this.messages.length - 1];
//   }
//   next();
// });

// conversationSchema.post("save", function (next) {
//   if (this.visibleFor.length === 0) {
//   }
//   next();
// });

// conversationSchema.post("save", function (doc, next) {
//   if (doc.messages.length > 0) {
//     doc.lastMessage = doc.messages[doc.messages.length - 1];
//     doc.save().then(() => next());
//   } else {
//     next();
//   }
// });

// conversationSchema.post("save", function (doc, next) {
//   if (doc.visibleFor.length === 0) {
//     doc
//       .deleteOne()
//       .then(() => next())
//       .catch(next);
//   } else {
//     next();
//   }
// });

module.exports = mongoose.model("Conversation", conversationSchema);
