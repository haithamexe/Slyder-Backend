const router = require("express").Router();
// const { protectMessageRoute } = require("../middleware/protectRoute");
const protectRoute = require("../middleware/protectRoute");

const {
  createMessage,
  getMessages,
  deleteMessages,
  getConversation,
  createConversation,
  deleteConversation,
  getConversations,
  // updateConversationStatus,
} = require("../controllers/messageController");

router.post("/create", protectRoute, createMessage);
router.delete(
  "/conversation/:conversationId",
  protectRoute,
  deleteConversation
);
router.get("/conversations", protectRoute, getConversations);
router.post("/conversation", protectRoute, createConversation);
router.post("/messages/:conversationId", protectRoute, getMessages);
router.delete("/messages/:conversationId", protectRoute, deleteMessages);
// router.get("/:conversationId", protectRoute, getMessages);
// router.get("/conversation/:receiverId", protectRoute, getConversation);
// router.put("/:messageId", protectMessageRoute, updateMessageStatus);
// router.delete("/:messageId", deleteMessage);

module.exports = router;
