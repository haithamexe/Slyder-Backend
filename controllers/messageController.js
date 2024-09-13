const User = require("../models/User");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const cloudinary = require("../config/cloudinaryConfig");
const { io } = require("../socket");
const { encrypt, decrypt } = require("../utility/cryptoUtil");

exports.createMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
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

    // const encryptedMessage = encrypt(message);

    const newMessage = new Message({
      conversation: conversation._id,
      sender: sender._id,
      receiver: receiver._id,
      message: message,
      status: "sent",
    });
    conversation.messages.push(newMessage._id);

    await Promise.all([newMessage.save(), conversation.save()]);

    // Emit the new message to the conversation room
    io.to(receiver._id.toString()).emit("newMessage", {
      message: newMessage,
      conversationId: conversation._id,
    });

    return res.status(200).json({ message: newMessage });
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

    // console.log("messages", messages);
    // console.log("lastMessage", lastMessage);
    let lastMessageDecrypted = "";
    if (messages.length > 0) {
      const lastMessage = messages[messages?.length - 1]?.message;
      lastMessageDecrypted = decrypt(lastMessage);
    } else {
    }

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
        message: lastMessageDecrypted,
        createdAt: messages[messages?.length - 1]?.createdAt,
      },
    };
    console.log("conversationData", conversationData);
    return res.status(200).json(conversationData);
  } catch (err) {
    console.log(err.message);
    console.log(err);
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

    const decryptedMessages = messages.map((message) => {
      try {
        const decryptedMessage = decrypt(message.message);
        return {
          ...message._doc,
          message: decryptedMessage,
        };
      } catch (error) {
        console.error("Error decrypting message:", error);
        return {
          ...message._doc,
          message: "Error decrypting message",
        };
      }
    });

    console.log("decryptedMessages", decryptedMessages);

    // io.to(conversationId).emit("message", messages);

    return res.status(200).json(decryptedMessages);
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

exports.getConversations = async (req, res) => {
  try {
    const user = req.user;
    const conversations = await Conversation.find({
      participants: { $in: [user._id] },
    })
      .populate("participants", "username picture firstName surName")
      .populate({
        path: "messages",
        options: { sort: { createdAt: -1 } },
      })
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    console.log("conversations", conversations);

    const conversationData = conversations.map((conversation) => {
      const receiver = conversation.participants.filter(
        (participant) => participant._id.toString() !== user._id.toString()
      )[0];
      console.log("receiver", receiver);
      // const decryptedMessages = conversation.messages.map((message) => {
      //   try {
      //     const decryptedMessage = decrypt(message.message);
      //     return {
      //       ...message._doc,
      //       message: decryptedMessage,
      //     };
      //   } catch (error) {
      //     console.error("Error decrypting message:", error);
      //     return {
      //       ...message._doc,
      //       message: "Error decrypting message",
      //     };
      //   }
      // });
      // const lastMessage = decryptedMessages[decryptedMessages.length - 1];

      return {
        ...conversation._doc,
        user: {
          _id: receiver._id,
          username: receiver.username,
          picture: receiver.picture,
          firstName: receiver.firstName,
          surName: receiver.surName,
        },
      };
    });

    return res.status(200).json(conversationData);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

exports.createConversation = async (req, res) => {
  try {
    const { receiverId } = req.body;
    console.log("receiverId", receiverId);
    if (!receiverId) {
      return res
        .status(400)
        .json({ message: "Receiver ID and User ID are required" });
    }
    const sender = req.user;

    if (sender._id.toString() === receiverId) {
      return res
        .status(400)
        .json({ message: "You cannot create a conversation with yourself" });
    }
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }
    const conversation = await Conversation.findOne({
      participants: { $all: [sender._id.toString(), receiver._id.toString()] },
    });

    // check if conversation already exists

    // if (conversation) {
    //   const messages = await Message.find({
    //     conversation: conversation._id,
    //   });
    //   const decryptedMessages = messages.map((msg) => {
    //     const decryptedMessage = decrypt(msg.message);
    //     return {
    //       ...msg._doc,
    //       message: decryptedMessage,
    //     };
    //   });
    //   const lastMessage = decryptedMessages[decryptedMessages.length - 1];
    //   const currentConversation = {
    //     ...conversation._doc,
    //     user: {
    //       _id: receiver._id,
    //       username: receiver.username,
    //       picture: receiver.picture,
    //       firstName: receiver.firstName,
    //       surName: receiver.surName,
    //     },
    //   };
    //   return res.status(200).json(currentConversation);
    // }

    const newConversation = new Conversation({
      participants: [sender._id, receiver._id],
    });
    await newConversation.save();

    io.to(receiver._id.toString()).emit("newConversation", {
      ...newConversation,
      user: {
        _id: sender._id,
        username: sender.username,
        picture: sender.picture,
        firstName: sender.firstName,
        surName: sender.surName,
      },
      messages: [],
      lastMessage: {},
    });
    io.to(sender._id.toString()).emit("newConversation", {
      ...newConversation,
      user: {
        _id: receiver._id,
        username: receiver.username,
        picture: receiver.picture,
        firstName: receiver.firstName,
        surName: receiver.surName,
      },
      messages: [],
      lastMessage: {},
    });

    return res.status(200);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

exports.getMoreMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page } = req.query;
    const user = req.user;

    if (!conversationId || !user) {
      return res
        .status(400)
        .json({ message: "Conversation ID and User ID are required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({
      conversation: conversation._id,
    })
      .sort({
        createdAt: -1,
      })
      .skip(parseInt(page) * 10)
      .limit(10)
      .exec();

    const decryptedMessages = messages.map((message) => {
      try {
        const decryptedMessage = decrypt(message.message);
        return {
          ...message._doc,
          message: decryptedMessage,
        };
      } catch (error) {
        console.error("Error decrypting message:", error);
        return {
          ...message._doc,
          message: "Error decrypting message",
        };
      }
    });

    return res.status(200).json(decryptedMessages);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};
