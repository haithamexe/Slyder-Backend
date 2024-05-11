const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const noteSchema = mongoose.Schema(
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
