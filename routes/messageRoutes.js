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
} = require("../controllers/messageController");

router.get("/conversations", protectRoute, getConversations);
router.post("/create", protectRoute, createMessage);
router.post("/conversation", protectRoute, createConversation);
router.get("/messages/:conversationId/:page", protectRoute, getMessages);
router.delete("/messages/:conversationId", protectRoute, deleteMessages);
router.delete(
  "/conversation/:conversationId",
  protectRoute,
  deleteConversation
);

module.exports = router;
