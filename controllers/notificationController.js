// const User = require("../models/User");
const Notification = require("../models/Notification");
const User = require("../models/User");

exports.createNotification = async (req, res) => {
  // try {
  //   const user = req.user;
  //   const { title, content } = req.body;
  //   if (!user || !title || !content) {
  //     return res
  //       .status(401)
  //       .json({ message: "You are not authorized to access this route" });
  //   }
  //   const notification = new Notification({
  //     sender: user._id,
  //     receiver: user._id,
  //   });
  //   await notification.save();
  //   res
  //     .status(201)
  //     .json({ message: "Notification created successfully", notification });
  // } catch (error) {
  //   console.log(error);
  //   res.status(500).json({ message: "Internal server error" });
  // }
};

exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).exec();

    if (!user) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    const notifications = await Notification.find({
      receiver: user._id,
      read: false,
    })
      .select("-receiver")
      .exec();
    if (!notifications) {
      return res.status(404).json({ message: "No notifications found" });
    }
    notifications.reverse();
    console.log(notifications);
    res.status(200).json(notifications);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMessagesNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).exec();

    if (!user) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    const messagesNotifications = await Notification.find({
      user: user._id,
      type: "message",
    }).exec();
    if (!messagesNotifications) {
      return res
        .status(404)
        .json({ message: "No messages notifications found" });
    }
    res.status(200).json(messagesNotifications);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// exports.getPostNotifications = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const user = await User.findById(userId).exec();

//     if (!user) {
//       return res
//         .status(401)
//         .json({ message: "You are not authorized to access this route" });
//     }
//     const postNotifications = await Notification.find({
//       user: user._id,
//       type: "post",
//     }).exec();
//     if (!postNotifications) {
//       return res.status(404).json({ message: "No post notifications found" });
//     }
//     res.status(200).json(postNotifications);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).exec();
    if (!user) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    await Notification.updateMany(
      { user: user._id },
      { read: true },
      { multi: true }
    ).exec();
    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
