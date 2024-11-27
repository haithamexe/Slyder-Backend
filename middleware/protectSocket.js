const User = require("../models/User");
const jwt = require("jsonwebtoken");

const protectSocket = async (socket, next) => {
  try {
    const refreshToken = socket.handshake.headers.cookie.split("=")[1];
    if (!refreshToken) {
      return socket.disconnect();
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (!decoded) {
      return socket.disconnect();
    }
    const user = await User.findById(decoded.id).exec();
    if (!user) {
      return socket.disconnect();
    }
    socket.user = user;

    next();
  } catch (error) {
    console.log("Socket error", error.message);
    return socket.disconnect();
  }
};

module.exports = protectSocket;
