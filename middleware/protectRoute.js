const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const protectMessageRoute = async (req, res, next) => {
  try {
    let token;
    // console.log(req);
    if (req.cookies.refreshTokenMessage) {
      token = req.cookies.refreshTokenMessage;
    }
    if (!token) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (!decoded) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    const user = await User.findById(decoded.id).exec();
    if (!user) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    req.user = user;
    // console.log("User is authenticated", user);
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "You are not authorized to access this route" });
  }
};

const protectPostRoute = async (req, res, next) => {
  try {
    let token;
    // console.log(req);
    if (req.cookies.refreshTokenPost) {
      token = req.cookies.refreshTokenPost;
    }
    if (!token) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (!decoded) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    const user = await User.findById(decoded.id).exec();
    if (!user) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    req.user = user;
    // console.log("User is authenticated", user);
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "You are not authorized to access this route" });
  }
};

const protectNoteRoute = async (req, res, next) => {
  try {
    let token;
    // console.log(req);
    if (req.cookies.refreshTokenNote) {
      token = req.cookies.refreshTokenNote;
    }
    if (!token) {
      return res.status(401).json({
        message: "You are not authorized to access this route noooo token",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (!decoded) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    const user = await User.findById(decoded.id).exec();
    if (!user) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this route" });
    }
    req.user = user;
    // console.log("User is authenticated", user);
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "You are not authorized to access this route" });
  }
};

module.exports = { protectMessageRoute, protectPostRoute, protectNoteRoute };
