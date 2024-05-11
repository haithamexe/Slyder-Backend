const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const postSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      min: 3,
      max: 15,
      trim: true,
      text: true,
    },
    content: {
      type: String,
      required: true,
      min: 3,
      max: 15,
      trim: true,
      text: true,
    },
    user: {
      type: ObjectId,
      ref: "User",
    },
    community: {
      type: ObjectId,
      ref: "Community",
    },
    Comments: [
      {
        type: ObjectId,
        ref: "Comment",
      },
    ],
    likes: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    shares: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
