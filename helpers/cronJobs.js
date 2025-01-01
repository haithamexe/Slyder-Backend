const cron = require("node-cron");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const User = require("../models/User");

const setupCronJobs = () => {
  cron.schedule("0 0 */6 * *", async () => {
    try {
      const currentDate = new Date(Date.now() - 1000 * 60 * 60 * 3);
      await Notification.deleteMany({
        read: true,
        type: { $ne: "message" },
        createdAt: { $lt: currentDate },
      }).exec();
    } catch (error) {
      console.log(error);
    }
  });

  cron.schedule("0 0 */6 * *", async () => {
    try {
      const currentDate = new Date(Date.now() - 1000 * 60 * 60 * 3);
      await Notification.deleteMany({
        read: true,
        type: "message",
        createdAt: { $lt: currentDate },
      }).exec();
    } catch (error) {
      console.log(error);
    }
  });

  console.log("Cron jobs set up");
};

module.exports = setupCronJobs;
