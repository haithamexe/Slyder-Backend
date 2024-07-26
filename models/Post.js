const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const postSchema = mongoose.Schema(
  {
    content: {
      type: String,
      min: 0,
      max: 1000,
    },
    image: {
      type: String,
      default: "",
    },
    user: {
      type: ObjectId,
      ref: "User",
    },
    community: {
      type: ObjectId,
      ref: "Community",
    },
    comments: {
      type: [ObjectId],
      ref: "Comment",
    },
    savedBy: {
      type: [ObjectId],
      ref: "Saved",
    },

    likes: {
      type: [ObjectId],
      ref: "Like",
    },

    shares: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
