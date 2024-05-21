const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const savedSchema = mongoose.Schema(
  {
    user: {
      type: ObjectId,
      ref: "User",
    },
    posts: [
      {
        type: ObjectId,
        ref: "Post",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Saved", savedSchema);
