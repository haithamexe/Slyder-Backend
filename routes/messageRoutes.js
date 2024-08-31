const router = require("express").Router();
// const { protectMessageRoute } = require("../middleware/protectRoute");
const protectRoute = require("../middleware/protectRoute");

const {
  createMessage,
  getMessages,
  deleteMessage,
  getConversation,
  createConversation,
  deleteConversation,
  updateMessageStatus,
  getConversations,
} = require("../controllers/messageController");

router.post("/create/:receiverId", protectRoute, createMessage);
router.delete("/conversation/:receiverId", protectRoute, deleteConversation);
router.get("/conversations", protectRoute, getConversations);
router.get("/:receiverId", protectRoute, getMessages);
router.post("/conversation/:receiverId", createConversation);
// router.get("/conversation/:receiverId", protectRoute, getConversation);
// router.put("/:messageId", protectMessageRoute, updateMessageStatus);
// router.delete("/:messageId", deleteMessage);

module.exports = router;
