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
} = require("../controllers/messageController");

router.post("/create/:receiverId", protectRoute, createMessage);
router.delete("/conversation/:receiverId", protectRoute, deleteConversation);
router.get("/conversation/:receiverId", protectRoute, getConversation);
router.get("/:receiverId", protectRoute, getMessages);
// router.put("/:messageId", protectMessageRoute, updateMessageStatus);
// router.delete("/:messageId", deleteMessage);
// router.post("/conversation/:receiverId", createConversation);

module.exports = router;
