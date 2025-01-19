const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const corsOptions = require("./config/corsOptions");
const protectSocket = require("./middleware/protectSocket");
const User = require("./models/User");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");
const Notification = require("./models/Notification");
const cors = require("cors");
const cron = require("node-cron");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const Note = require("./models/Note");
const Comment = require("./models/Comment");
const mongoose = require("mongoose");
const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

const CACHE_KEY_PREFIX = "user_feed:";
const CACHE_TTL = 60 * 60;

const invalidateUserFeedCache = async (userId) => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    await redis.del(cacheKey);
  } catch (error) {
    console.error("Error invalidating cache:", error);
  }
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://slyder-omega.vercel.app",
      "https://slyder.vercel.app",
      "https://slyder-backend.vercel.app",
      "https://slyder-backend.onrender.com",
    ],
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true, // Enable Engine.IO v3 compatibility
});

io.use(protectSocket);

const userSocketMap = new Map();

io.on("connection", (socket) => {
  // const userId = socket.handshake.query.userId;
  console.log("User connected", socket.user._id);
  const userId = socket.user._id.toString();
  if (!userId) {
    return socket.emit("error", "You are not authorized to access this route");
  }
  if (userId && !userSocketMap.has(userId)) {
    userSocketMap.set(userId, socket.id);
    socket.join(userId);
  }

  io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

  socket.on("joinConversations", (conversationIds) => {
    conversationIds.forEach((conversationId) => {
      socket.join(conversationId);
    });
  });

  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("messageSeen", async ({ conversationId }) => {
    try {
      const otherUser = await Conversation.findById(conversationId);
      const otherUserId = otherUser.participants.find(
        (participant) => participant.toString() !== userId
      );
      const status = await Message.updateMany(
        {
          conversation: conversationId,
          status: "sent",
          sender: otherUserId,
        },
        { status: "seen" }
      );

      const notification = await Notification.updateMany(
        {
          conversation: conversationId,
          type: "message",
          sender: otherUserId,
          read: false,
        },
        { read: true }
      );

      if (!notification || !status) {
        console.log("message seen error", conversationId, messageId);
      } else {
        socket.to(conversationId).emit("messageSeen", { conversationId });
      }
    } catch (error) {
      console.log("message seen error", error.message);
    }
  });

  socket.on("typing", (conversationId) => {
    socket.to(conversationId).emit("typing", conversationId);
  });

  socket.on("stopTyping", (conversationId) => {
    socket.to(conversationId).emit("stopTyping", conversationId);
  });

  socket.on("newMessage", async ({ message, conversationId, receiverId }) => {
    try {
      const newMessage = new Message({
        conversation: conversationId,
        message: message,
        sender: socket.user._id,
        receiver: receiverId,
        visibleFor: [socket.user._id, receiverId],
      });

      const newMessageFormatted = {
        ...newMessage._doc,
        createdAt: new Date().toISOString(),
      };

      socket
        .to(conversationId)
        .emit("newMessage", newMessageFormatted, conversationId);

      const conversation = await Conversation.findById(conversationId);
      conversation.messages.push(newMessage._id);

      const notification = new Notification({
        receiver: receiverId,
        sender: socket.user._id,
        type: "message",
        conversation: conversationId,
      });

      await Promise.all([
        newMessage.save(),
        conversation.save(),
        notification.save(),
      ]);

      if (conversation.visibleFor.length !== 2) {
        await Conversation.updateOne(
          { _id: conversationId },
          { visibleFor: [socket.user._id, receiverId] }
        );

        io.to(receiverId).emit("newMessageNoConversation", {
          _id: conversationId,
          updatedAt: conversation.updatedAt,
          lastMessage: {
            message: message,
            sender: socket.user._id,
            receiver: receiverId,
            visibleFor: [socket.user._id, receiverId],
            createdAt: newMessageFormatted.createdAt,
          },
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            picture: socket.user.picture,
            firstName: socket.user.firstName,
            surName: socket.user.surName,
          },
        });
      }
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("leaveConversation", (conversationId) => {
    socket.leave(conversationId);

    if (userId == "678cb8110e2832aea20e0d73") {
      //demo account
      console.log("Demo account offline");
      handleDemoAccountOffline();
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      userSocketMap.delete(userId);
      console.log("User disconnected", userId);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));

      if (userId == "678cb8110e2832aea20e0d73") {
        //demo account
        console.log("Demo account offline");
        handleDemoAccountOffline();
      }
    }
  });
});

const handleDemoAccountOffline = async () => {
  const demoUser = await User.findById("678cb8110e2832aea20e0d73");
  if (demoUser) {
    const password = await bcrypt.hash(
      "test1234",
      parseInt(process.env.SALT_ROUNDS)
    );

    demoUser.picture =
      "https://res.cloudinary.com/dcfy1isux/image/upload/v1719119008/placeholder-img.png";
    demoUser.cover =
      "https://res.cloudinary.com/dcfy1isux/image/upload/v1737276290/slyder/wlgsa65e8i8aznqeeafe.jpg";
    demoUser.firstName = "Demo";
    demoUser.surName = "Account";
    demoUser.username = "demoaccount";
    demoUser.email = "demo@slydermail.com";
    demoUser.details.website = "";
    demoUser.details.bio = "";
    demoUser.details.skills = ["coding", "gaming", "music", "sports"];
    demoUser.password = password;
    const followingUsers = [
      "6772ea844c19dcaee43d349b",
      "677307de3e17b58c1d48f709",
      "667b1bb3fd75d88d3d39cf65",
      "667b1e366560eb28926409d1",
    ];
    const usersFollowingsObjectIds = followingUsers.map((id) => {
      return new mongoose.Types.ObjectId(id);
    });
    demoUser.following = usersFollowingsObjectIds;
    const contactsIds = [
      "6772ea844c19dcaee43d349b",
      "677307de3e17b58c1d48f709",
      "667b1bb3fd75d88d3d39cf65",
      "667b1e366560eb28926409d1",
    ];
    const contactsObjectIds = contactsIds.map((id) => {
      return new mongoose.Types.ObjectId(id);
    });
    demoUser.contacts = contactsObjectIds;

    await Note.deleteMany({ user: demoUser._id });
    const notes = [
      {
        title: "Welcome to Slyder",
        content: "This is a demo note",
      },
      {
        title: "Note 2",
        content: "This is a demo note",
      },
    ];

    notes.forEach(async (note) => {
      const newNote = new Note({
        title: note.title,
        content: note.content,
        user: demoUser._id,
      });
      await newNote.save();
    });

    const posts = await Post.deleteMany({ user: demoUser._id.toString() });
    console.log("Deleted posts", posts);

    invalidateUserFeedCache(demoUser._id);

    await Conversation.deleteMany({
      participants: {
        $in: [demoUser._id],
      },
    });

    const otherUser = await User.findById("6772ea844c19dcaee43d349b");
    const newConversation = new Conversation({
      participants: [demoUser._id, otherUser._id],
      visibleFor: [demoUser._id, otherUser._id],
    });
    await newConversation.save();

    await Comment.deleteMany({ author: demoUser._id });

    await Message.deleteMany({ sender: demoUser._id });

    await demoUser.save();

    console.log("Demo account updated");
  }
};

module.exports = { app, io, server };
