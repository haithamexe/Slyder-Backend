// const { protectNotificationRoute } = require("../middleware/protectRoute");
const router = require("express").Router();
const protectRoute = require("../middleware/protectRoute");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.get("/", protectRoute, getNotifications);
router.put("/mark-read", protectRoute, markAsRead);
// router.put("/mark-all-read", markAllAsRead);

module.exports = router;
