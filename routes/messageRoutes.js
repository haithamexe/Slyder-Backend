const router = require("express").Router();
const protectRoute = require("../middleware/protectRoute");

const {
  createMessage,
  getMessages,
  deleteMessage,
  getConversation,
  createConversation,
  deleteConversation,
} = require("../controllers/messageController");

router.post("/create/:receiverId", protectRoute, createMessage);
// router.get("/", getMessages);
// router.delete("/:messageId", deleteMessage);
router.get("/conversation/:receiverId", protectRoute, getConversation);
// router.post("/conversation/:receiverId", createConversation);
// router.delete("/conversation/:receiverId", deleteConversation);

module.exports = router;
