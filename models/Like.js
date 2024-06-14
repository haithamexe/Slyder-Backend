const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const likeSchema = new mongoose.Schema(
  {
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: ObjectId,
      ref: "Post",
      required: true,
    },
    // Add other models as needed
    // onModel: {
    //   type: String,
    //   required: true,
    //   enum: ["Post", "Comment"],
    // },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Like", likeSchema);
