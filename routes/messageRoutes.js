const router = require("express").Router();
const { protectMessageRoute } = require("../middleware/protectRoute");

const {
  createMessage,
  getMessages,
  deleteMessage,
  getConversation,
  createConversation,
  deleteConversation,
  updateMessageStatus,
} = require("../controllers/messageController");

router.post("/create/:receiverId", protectMessageRoute, createMessage);
router.delete(
  "/conversation/:receiverId",
  protectMessageRoute,
  deleteConversation
);
router.get("/conversation/:receiverId", protectMessageRoute, getConversation);
router.get("/:receiverId", protectMessageRoute, getMessages);
// router.put("/:messageId", protectMessageRoute, updateMessageStatus);
// router.delete("/:messageId", deleteMessage);
// router.post("/conversation/:receiverId", createConversation);

module.exports = router;
