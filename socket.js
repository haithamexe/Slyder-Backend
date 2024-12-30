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

const app = express();
const server = http.createServer(app);

// if (process.env.NODE_ENV !== "production") {
// } else {
//   server = https.createServer(app);
// }

// const io = new Server(server, {
//   cors: {
//     origin: [
//       "http://localhost:3000",
//       "https://slyderback.vercel.app",
//       "https://slyder-omega.vercel.app",
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//     credentials: true,
//   },
// });

// const io = new Server(server, {
//   cors: {
//     origin: [
//       "http://localhost:3000",
//       "https://slyderback.vercel.app",
//       "https://slyder-omega.vercel.app",
//       "https://slyder.vercel.app",  // Add your main Vercel domain
//       "https://*.vercel.app",       // Allow all Vercel preview deployments
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//     credentials: true,
//     allowedHeaders: ["Content-Type", "Authorization", "refreshToken"], // Add allowed headers
//   },
//   transports: ['polling'], // Explicitly specify transport methods
//   path: '/socket.io', // Explicitly specify the path to the socket.io server
//   allowEIO3: true, // Explicitly allow the EIO3 protocol
//   pingTimeout: 60000, // 60 seconds
// });

// const io = new Server(server, {
//   cors: {
//     origin: [
//       "http://localhost:3000",
//       "https://slyder-omega.vercel.app",
//       "https://slyder-backend.onrender.com"
//     ],
//     credentials: true,
//     methods: ["GET", "POST"]
//   },
// });

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://slyder-omega.vercel.app",
      "https://slyder.vercel.app",
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
  const userId = socket.user._id.toString();
  console.log("connectenting ", userId);
  if (!userId) {
    return socket.emit("error", "You are not authorized to access this route");
  }
  if (userId && !userSocketMap.has(userId)) {
    userSocketMap.set(userId, socket.id);
    socket.join(userId);
  }

  // security issue here
  // const followersOnline = socket.user.following.filter((following) =>
  //   userSocketMap.has(following) ? following : null
  // );

  io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

  socket.on("joinConversations", (conversationIds) => {
    conversationIds.forEach((conversationId) => {
      socket.join(conversationId);
      console.log("Joined", conversationId);
    });
  });

  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log("Joined", conversationId);
  });

  socket.on("messageSeen", async ({ conversationId }) => {
    try {
      const [status, notification] = await Promise.all([
        Message.updateMany(
          {
            conversation: conversationId,
            sender: socket.user._id,
            status: "sent",
          },
          { status: "seen" }
        ),
        Notification.updateMany(
          {
            conversation: conversationId,
            type: "message",
            read: false,
            sender: socket.user._id,
          },
          { read: true }
        ),
      ]);

      if (!notification || !status) {
        console.log("message seen error", conversationId, messageId);
      } else {
        socket.to(conversationId).emit("messageSeen", { conversationId });
        // const dateNow = new Date(Date.now());
        // const hours = dateNow.getHours();
        // if (hours % 12 === 0) {
        //   const currentDate = new Date(Date.now() - 1000 * 60 * 60 * 3);

        //   await Notification.deleteMany({
        //     conversation: conversationId,
        //     type: "message",
        //     read: true,
        //     sender: socket.user._id,
        //     createdAt: { $lt: currentDate },
        //   });
        // }
      }
    } catch (error) {
      console.log("message seen error", error.message);
    }
  });

  socket.on("messageSeenWithId", async ({ conversationId, messageId }) => {
    try {
      const status = await Message.updateOne(
        {
          conversation: conversationId,
          _id: messageId,
          status: "sent",
          // sender: socket.user._id,
        },
        { status: "seen" }
      );

      const notification = await Notification.updateOne(
        {
          conversation: conversationId,
          type: "message",
          read: false,
          // sender: socket.user._id,
        },
        { read: true }
      );

      if (!notification || !status) {
        console.log("message seen error", conversationId, messageId);
      }
    } catch (error) {
      console.log("message seen error", error.message);
    }
  });

  socket.on("typing", (conversationId) => {
    socket.to(conversationId).emit("typing", conversationId);
    console.log("typing");
  });

  socket.on("stopTyping", (conversationId) => {
    socket.to(conversationId).emit("stopTyping", conversationId);
    console.log("Stopped typing");
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
    console.log("Left", conversationId);
  });

  socket.on("disconnect", () => {
    if (userId) {
      userSocketMap.delete(userId);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

module.exports = { app, io, server };
