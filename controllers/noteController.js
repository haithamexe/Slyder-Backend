const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Note = require("../models/Note");

exports.createNote = async (req, res) => {
  try {
    const user = req.user;
    const { title, content } = req.body;
    if (!user || !title || !content) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    const note = new Note({
      title,
      content,
      user: user._id,
    });
    await note.save();
    res.status(201).json({ message: "Note created successfully", note });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const user = req.user;
    const notes = await Note.find({ user: user._id }).exec();
    if (!notes) {
      return res.status(404).json({ message: "No notes found" });
    }
    res.status(200).json(notes);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    if (!noteId) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    const note = await Note.findByIdAndDelete(noteId).exec();
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    // await note.remove();
    return res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
