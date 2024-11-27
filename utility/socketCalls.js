const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const { io } = require("../socket");

exports.messageSeen = async (conversationId, messageId, userId) => {
  const conversation = await Conversation.findById(conversationId).populate(
    "participants",
    "username"
  );
  if (!conversation) return;

  const message = await Message.findByIdAndUpdate(messageId, {
    status: "seen",
  });

  if (!message) return;

  const user = await User.findById(userId).lean().exec();

  io.to(user._id).emit("messageSeen", {
    conversationId,
    messageId,
  });
};
