const router = require("express").Router();
const { protectNoteRoute } = require("../middleware/protectRoute");

const {
  createNote,
  getNotes,
  deleteNote,
} = require("../controllers/noteController");

router.delete("/:noteId", deleteNote);
router.get("/:userId", getNotes);
router.post("/create", protectNoteRoute, createNote);

module.exports = router;
