const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const communitySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      min: 3,
      max: 15,
      trim: true,
      text: true,
    },
    description: {
      type: String,
      required: true,
      min: 3,
      max: 15,
      trim: true,
      text: true,
    },
    members: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],
    posts: [
      {
        type: ObjectId,
        ref: "Post",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Community", communitySchema);
