const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const noteSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      min: 2,
      max: 20,
    },
    content: {
      type: String,
      required: true,
      min: 2,
      max: 20,
    },
    user: {
      type: ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
