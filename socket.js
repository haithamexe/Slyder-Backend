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

  socket.on("joinRoom", (conversationId) => {
    socket.join(conversationId);
    console.log(`User joined room ${conversationId}`);
  });

  socket.on("leaveRoom", (conversationId) => {
    socket.leave(conversationId);
    console.log(`User left room ${conversationId}`);
  });
});

module.exports = { app, io, server };
