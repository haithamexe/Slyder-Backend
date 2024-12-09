const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    post: {
      type: ObjectId,
      ref: "Post",
      required: true,
    },
    author: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    likes: {
      type: [ObjectId],
      ref: "User",
    },
    parentComment: {
      type: ObjectId,
      ref: "Comment",
    },
    replies: [
      {
        type: ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
