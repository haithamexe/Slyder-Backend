const User = require("../models/User");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const cloudinary = require("../config/cloudinaryConfig");
const { io } = require("../socket");

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
    })
      .select("-messages")
      .populate({
        path: "participants",
        select: ["username", "picture", "firstName", "surName"],
        match: { _id: { $ne: sender._id } },
      })
      .exec();

    if (conversation) {
      if (!conversation.visibleFor.includes(sender._id)) {
        conversation.visibleFor.push(sender._id);
      }
      const lastMessage = await Message.findOne({
        conversation: conversation._id,
      })
        .sort({ createdAt: -1 })
        .exec();

      io.to(sender._id.toString()).emit("newConversation", {
        ...conversation,
        lastMessage: {
          message: lastMessage?.message,
          createdAt: lastMessage?.createdAt,
        },
        user: {
          _id: receiver._id,
          username: receiver.username,
          picture: receiver.picture,
          firstName: receiver.firstName,
          surName: receiver.surName,
        },
      });

      await conversation.save();
      return res.status(200).json(conversation);
    }

    const newConversation = new Conversation({
      participants: [sender._id, receiver._id],
      visibleFor: [sender._id, receiver._id],
    });

    await newConversation.save();

    io.to(receiver._id.toString()).emit("newConversation", {
      ...newConversation._doc,
      user: {
        _id: sender._id,
        username: sender.username,
        picture: sender.picture,
        firstName: sender.firstName,
        surName: sender.surName,
      },
    });
    io.to(sender._id.toString()).emit("newConversation", {
      ...newConversation._doc,
      user: {
        _id: receiver._id,
        username: receiver.username,
        picture: receiver.picture,
        firstName: receiver.firstName,
        surName: receiver.surName,
      },
    });

    return res.status(200).json(newConversation);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

exports.createMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const user = req.user;
    if (!conversationId || !user) {
      return res
        .status(400)
        .json({ message: "Receiver ID and User ID are required" });
    }
    const sender = user;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      conversation = new Conversation({
        participants: [sender._id, receiver._id],
      });
      // await conversation.save();
    }
    const receiver = conversation.participants.find(
      (participant) => participant.toString() !== sender._id.toString()
    );
    const newMessage = new Message({
      conversation: conversation._id,
      sender: sender._id,
      receiver: receiver,
      message: message,
    });

    io.to(receiver.toString()).emit("newMessage", {
      message: newMessage,
      conversationId: conversation._id,
    });

    conversation.messages.push(newMessage._id);

    await Promise.all([newMessage.save(), conversation.save()]);

    // Emit the new message to the conversation room

    // io.to(sender._id.toString()).emit("newMessage", {
    //   message: newMessage,
    //   conversationId: conversation._id,
    // });

    return res.status(200).json({ message: newMessage });
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const sender = req.user;

    // console.log("receiverId", receiverId, "user", user);

    if (!conversationId || !sender) {
      return res
        .status(400)
        .json({ message: "Receiver ID and User ID are required" });
    }
    const conversation = await Conversation.findById(conversationId)
      .populate({
        path: "participants",
        select: ["username", "picture", "firstName", "surName"],
        match: { _id: { $ne: sender._id } },
      })
      .select("-messages");

    const messages = await Message.findOne({
      conversation: conversationId,
    })
      .sort({ createdAt: -1 })
      .populate("receiver");
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    conversation.visibleFor.includes(sender._id)
      ? null
      : conversation.visibleFor.push(sender._id);

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

exports.getConversations = async (req, res) => {
  try {
    const user = req.user;

    // const conversations = await Conversation.find({
    //   participants: { $in: [user._id] },
    //   visibleFor: { $in: [user._id] },
    // })
    //   .populate({
    //     path: "participants",
    //     select: ["username", "picture", "firstName", "surName"],
    //     match: { _id: { $ne: user._id } },
    //   })
    //   .populate({
    //     path: "messages",
    //     select: ["message", "status", "createdAt"],
    //     options: { sort: { createdAt: -1 }, limit: 1 },
    //   })
    //   .select("-messages")
    //   .sort({ updatedAt: -1 });

    // if (!conversations) {
    //   return res.status(404).json({ message: "Conversations not found" });
    // }

    // const updatedConversations = conversations.map((conversation) => {
    //   const lastMessage = conversation.messages[0];
    //   const updatedConversation = {
    //     ...conversation._doc,
    //     lastMessage: {
    //       _id: lastMessage?._id,
    //       message: lastMessage?.message,
    //       createdAt: lastMessage?.createdAt,
    //       status: lastMessage?.status,
    //     },
    //     user: {
    //       _id: conversation.participants[0]?._id,
    //       username: conversation.participants[0]?.username,
    //       picture: conversation.participants[0]?.picture,
    //       firstName: conversation.participants[0]?.firstName,
    //       surName: conversation.participants[0]?.surName,
    //     },
    //   };
    //   return updatedConversation;
    // });

    const conversations = await Conversation.aggregate([
      // Match conversations where the user is a participant and the conversation is visible to them
      {
        $match: {
          participants: user._id,
          visibleFor: user._id,
        },
      },
      // Lookup participants and filter out the current user
      {
        $lookup: {
          from: "users", // Assuming the users collection is named 'users'
          localField: "participants",
          foreignField: "_id",
          as: "participantDetails",
        },
      },
      {
        $unwind: {
          path: "$participantDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      // Filter out the current user from participants
      {
        $match: {
          "participantDetails._id": { $ne: user._id },
        },
      },
      // Lookup last message
      {
        $lookup: {
          from: "messages", // Assuming the messages collection is named 'messages'
          localField: "_id",
          foreignField: "conversation",
          as: "messages",
          pipeline: [
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $project: {
                message: 1,
                status: 1,
                createdAt: 1,
                sender: 1,
                receiver: 1,
              },
            },
          ],
        },
      },
      // Reshape the document
      {
        $project: {
          _id: 1,
          updatedAt: 1,
          lastMessage: { $arrayElemAt: ["$messages", 0] },
          user: {
            _id: "$participantDetails._id",
            username: "$participantDetails.username",
            picture: "$participantDetails.picture",
            firstName: "$participantDetails.firstName",
            surName: "$participantDetails.surName",
          },
        },
      },
      // Sort by most recently updated
      {
        $sort: { updatedAt: -1 },
      },
    ]);

    if (!conversations || conversations.length === 0) {
      return res.status(404).json({ message: "Conversations not found" });
    }

    return res.status(200).json(conversations);

    // return res.status(200).json(updatedConversations);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId, page } = req.params;
    const user = req.user;

    if (!conversationId || !user || !page) {
      return res
        .status(400)
        .json({ message: "Conversation ID and User ID are required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({
      conversation: conversationId,
    })
      .sort({
        createdAt: -1,
      })
      .skip(parseInt(page) * 20)
      .limit(20)
      .exec();

    return res.status(200).json(messages);
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

exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
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

    await conversation.visibleFor.pull(user._id);

    await Message.updateMany(
      {
        conversation: conversation._id,
        visibleFor: { $ne: user._id },
      },
      {
        $pull: { visibleFor: user._id },
      }
    );

    await conversation.save();
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

exports.deleteMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
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

    if (!conversation.participants.includes(user._id)) {
      return res
        .status(403)
        .json({ message: "User not part of this conversation" });
    }

    await Message.updateMany(
      {
        conversation: conversation._id,
        visibleFor: { $in: [user._id] },
      },
      {
        $pull: { visibleFor: user._id },
      }
    );

    await Message.deleteMany({
      conversation: conversation._id,
      visibleFor: { $size: 0 },
    });

    return res.status(200).json({ message: "Messages deleted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};
