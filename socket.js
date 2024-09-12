const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const corsOptions = require("./config/corsOptions");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
});

const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId != "undefined") userSocketMap[userId] = socket.id;
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
  socket.on("joinNotificationRoom", (userId) => {
    socket.join(userId);
    console.log(`User joined notification room ${userId}`);
  });
  socket.off("joinNotificationRoom", (userId) => {
    // socket.join(userId);
    socket.leave(userId);
    console.log(`User quited notification room ${userId}`);
  });
  socket.on("joinConversationRoom", (userId) => {
    socket.join(userId);
    console.log(`User joined room ${userId}`);
  });
  socket.on("leaveConversationRoom", (userId) => {
    socket.leave(userId);
    console.log(`User left room ${userId}`);
  });
  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`User joined room ${userId}`);
  });
  socket.on("leaveRoom", (userId) => {
    socket.leave(userId);
    console.log(`User left room ${userId}`);
  });
});

module.exports = { app, io, server };
