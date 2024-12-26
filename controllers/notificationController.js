const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const { io } = require("../socket");

const User = mongoose.model("User");
const Message = mongoose.model("Message");
const Conversation = mongoose.model("Conversation");

exports.getNotifications = async (req, res) => {
  try {
    const user = req.user;
    const notifications = await Notification.find({
      receiver: user._id,
      type: { $ne: "message" },
      read: false,
    })
      .sort({ createdAt: -1 })
      .populate([
        { path: "sender", select: "firstName surName username picture" },
        { path: "post", select: "image" },
      ])
      .exec();

    if (!notifications) {
      return res.status(404).json({ message: "No notifications found" });
    }
    // console.log(notifications);
    res.status(200).json(notifications);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMessagesNotifications = async (req, res) => {
  try {
    const user = req.user;

    const messagesNotifications = await Notification.aggregate([
      {
        $match: {
          receiver: user._id, // Filter by receiver ID
          type: "message", // Filter by type
          read: false, // Only unread notifications
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort notifications by newest first
      },
      {
        $group: {
          _id: "$conversation", // Group by conversation
          lastNotification: { $first: "$$ROOT" }, // Take the first notification in each group
        },
      },

      {
        $replaceRoot: { newRoot: "$lastNotification" }, // Replace the root with the first notification in each group
      },
    ]);

    // const messagesNotifications = await Notification.find({
    //   receiver: user._id,
    //   type: "message",
    //   read: false,
    // }).sort({ createdAt: -1 });

    return res.status(200).json(messagesNotifications);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const user = req.user;
    const notifications = await Notification.updateMany(
      { receiver: user._id, read: false, type: { $ne: "message" } },
      { read: true }
    ).exec();
    if (!notifications) {
      return res.status(404).json({ message: "No unread notifications found" });
    }

    // notifications should be deleted

    // const currentDate = new Date(Date.now() - 1000 * 60 * 60 * 3);
    // await Notification.deleteMany({
    //   receiver: user._id,
    //   read: true,
    //   type: { $ne: "message" },
    //   createdAt: { $lt: currentDate },
    // }).exec();

    // io.to(user._id).emit("clearNotifications");
    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
