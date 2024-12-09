// const { protectNotificationRoute } = require("../middleware/protectRoute");
const router = require("express").Router();
const protectRoute = require("../middleware/protectRoute");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getMessagesNotifications,
} = require("../controllers/notificationController");

router.get("/", protectRoute, getNotifications);
router.put("/mark-read", protectRoute, markAsRead);
router.get("/messages", protectRoute, getMessagesNotifications);
// router.put("/mark-all-read", markAllAsRead);

module.exports = router;
