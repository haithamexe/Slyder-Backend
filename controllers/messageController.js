const User = require("../models/User");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const cloudinary = require("../config/cloudinaryConfig");
const { io } = require("../socket");

exports.createMessage = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const user = req.user;
    if (!receiverId || !user) {
      return res
        .status(400)
        .json({ message: "Receiver ID and User ID are required" });
    }
    const sender = user;
    const receiver = await User.findById(receiverId);
    let conversation = await Conversation.findOne({
      participants: { $all: [sender._id, receiver._id] },
    });
    if (!conversation) {
      conversation = new Conversation({
        participants: [sender._id, receiver._id],
      });
      await conversation.save();
    }
    const newMessage = new Message({
      conversation: conversation._id,
      sender: sender._id,
      receiver: receiver._id,
      message: req.body.message,
      status: "sent",
    });
    conversation.messages.push(newMessage._id);

    await Promise.all([newMessage.save(), conversation.save()]);

    // Emit the new message to the conversation room
    io.to(conversation._id.toString()).emit("newMessage", newMessage);

    return res.status(200).json(newMessage);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

exports.updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ message: "Message ID is required" });
    }

    const user = req.user;
    const message = await Message.findById(messageId).exec();

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.receiver.toString() !== user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this message" });
    }

    message.status = "seen";
    await message.save();

    // Emit the updated message status to the conversation room
    io.to(message?.conversation.toString()).emit(
      "messageStatusUpdated",
      message
    );

    return res.status(200).json(message);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const user = req.user;

    // console.log("receiverId", receiverId, "user", user);

    if (!receiverId || !user) {
      return res
        .status(400)
        .json({ message: "Receiver ID and User ID are required" });
    }
    const sender = user;
    const receiver = await User.findById(receiverId);
    const conversation = await Conversation.findOne({
      participants: { $all: [sender._id, receiver._id] },
    });

    if (!conversation) {
      const newConversation = new Conversation({
        participants: [sender._id, receiver._id],
      });
      await newConversation.save();
    }

    const messages = await Message.find({
      _id: { $in: conversation?.messages },
    });
    const conversationData = {
      _id: conversation._id,
      user: {
        _id: receiver._id,
        username: receiver.username,
        picture: receiver.picture,
        firstName: receiver.firstName,
        surName: receiver.surName,
      },
      lastMessage: {
        message: messages[messages?.length - 1]?.message,
        createdAt: messages[messages?.length - 1]?.createdAt,
      },
    };
    console.log("conversationData", conversationData);
    return res.status(200).json(conversationData);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json(err);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const user = req.user;
    if (!receiverId || !user) {
      return res
        .status(400)
        .json({ message: "receiverId ID and User ID are required" });
    }
    const conversation = await Conversation.findOne({
      participants: { $all: [user._id, receiverId] },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const messages = await Message.find({
      conversation: conversation._id,
    })
      .sort({
        createdAt: -1,
      })
      .exec();
    // io.to(conversationId).emit("message", messages);

    return res.status(200).json(messages);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};
exports.deleteConversation = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const user = req.user;
    if (!receiverId || !user) {
      return res
        .status(400)
        .json({ message: "Receiver ID and User ID are required" });
    }

    const conversation = await Conversation.findOne({
      participants: { $all: [user._id, receiverId] },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversation: conversation._id });

    // Clear the messages array in the conversation
    conversation.messages = [];
    await conversation.save();

    // Remove the receiver from the user's contacts

    // Optionally, delete the conversation itself
    // await Conversation.findByIdAndDelete(conversation._id);

    return res
      .status(200)
      .json({ message: "Conversation and messages deleted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};
