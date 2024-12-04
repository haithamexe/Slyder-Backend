const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const corsOptions = require("./config/corsOptions");
const protectSocket = require("./middleware/protectSocket");
const User = require("./models/User");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
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

  socket.on("leaveConversation", (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on("messageSeen", async ({ conversationId, messageId }) => {
    try {
      const status = await Message.findByIdAndUpdate(messageId, {
        status: "seen",
      });
      if (!status) {
        socket.emit("error", {
          message: "Message not found",
          status: 404,
          event: "messageSeen",
        });
      } else {
        socket
          .to(conversationId)
          .emit("messageSeen", { conversationId, messageId });
      }
    } catch (error) {
      socket.emit("error", {
        message: "Internal server error",
        status: 500,
        event: "messageSeen",
      });
    }
  });

  socket.on("typing", ({ conversationId }) => {
    socket.to(conversationId).emit("typing", { conversationId });
  });

  socket.on("stopTyping", ({ conversationId }) => {
    socket.to(conversationId).emit("stopTyping", { conversationId });
  });

  socket.on("newMessage", async ({ message, conversationId, receiverId }) => {
    try {
      console.log("newMessage sending " + " to " + conversationId);
      const newMessage = new Message({
        conversation: conversationId,
        message: message,
        sender: socket.user._id,
        receiver: receiverId,
      });

      const newMessageFormatted = {
        ...newMessage._doc,
        createdAt: new Date().toISOString(),
      };

      socket.to(conversationId).emit("newMessage", {
        message: newMessageFormatted,
        conversationId,
      });

      const conversation = await Conversation.findById(conversationId);
      conversation.messages.push(newMessage._id);

      await Promise.all([newMessage.save(), conversation.save()]);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      userSocketMap.delete(userId);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

module.exports = { app, io, server };
