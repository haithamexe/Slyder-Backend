const User = require("../models/User");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const cloudinary = require("../config/cloudinaryConfig");

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
      }).exec();
    }
    const newMessage = new Message({
      conversationId: conversation?._id,
      sender: sender._id,
      receiver: receiver._id,
      message: req.body.message,
    });
    conversation.messages.push(newMessage._id);

    await Promise.all([newMessage.save(), conversation.save()]);

    return res.status(200).json(newMessage);
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
      }).exec();
      await newConversation.save();
    }

    const messages = await Message.find({
      _id: { $in: conversation?.messages },
    });
    const conversationData = {
      _id: conversation._id,
      messages,
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
