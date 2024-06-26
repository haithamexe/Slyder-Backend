// const { protectNotificationRoute } = require("../middleware/protectRoute");
const router = require("express").Router();

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.get("/:userId", getNotifications);
router.put("/mark-read/:userId", markAsRead);
// router.put("/mark-all-read", markAllAsRead);

module.exports = router;
