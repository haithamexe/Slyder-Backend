const router = require("express").Router();
const protectRoute = require("../middleware/protectRoute");

const {
  createNote,
  getNotes,
  deleteNote,
} = require("../controllers/noteController");

router.delete("/:noteId", deleteNote);
router.get("/", protectRoute, getNotes);
router.post("/create", protectRoute, createNote);

module.exports = router;
