require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dbConnect = require("../config/dbConnect");
const User = require("../models/User");

(async () => {
  try {
    const [email, newPassword, mongoUriArg] = process.argv.slice(2);
    if (!email || !newPassword) {
      console.error(
        "Usage: node scripts/resetPassword.js <email> <newPassword>"
      );
      process.exit(1);
    }

    // Allow passing a Mongo URI as 3rd arg if env missing
    if (mongoUriArg && !process.env.DATABASE_URL) {
      process.env.DATABASE_URL = mongoUriArg;
    }

    if (!process.env.DATABASE_URL) {
      console.error(
        "DATABASE_URL is not set. Set it in .env or pass as the 3rd argument."
      );
      console.error(
        "Example: node scripts/resetPassword.js <email> <newPassword> <mongodb+srv://...>"
      );
      process.exit(4);
    }

    await dbConnect();

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).exec();
    if (!user) {
      console.error("User not found for email:", email);
      process.exit(2);
    }

    const rounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
    const hashed = await bcrypt.hash(newPassword, rounds);

    user.password = hashed;
    await user.save();

    console.log("Password updated for:", user.email);
  } catch (err) {
    console.error("Failed to reset password:", err.message);
    process.exit(3);
  } finally {
    try {
      await mongoose.connection.close();
    } catch (_) {}
  }
})();
