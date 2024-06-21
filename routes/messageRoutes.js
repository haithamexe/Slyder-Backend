const router = require("express").Router();
const { protectMessageRoute } = require("../middleware/protectRoute");

const {
  createMessage,
  getMessages,
  deleteMessage,
  getConversation,
  createConversation,
  deleteConversation,
} = require("../controllers/messageController");

router.post("/create/:receiverId", protectMessageRoute, createMessage);
// router.get("/", getMessages);
// router.delete("/:messageId", deleteMessage);
router.get("/conversation/:receiverId", protectMessageRoute, getConversation);
// router.post("/conversation/:receiverId", createConversation);
// router.delete("/conversation/:receiverId", deleteConversation);

module.exports = router;
