const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const protectRoute = async (req, res, next) => {
  try {
    let token;
    // console.log(req);
    if (req.cookies.refreshTokenAuth) {
      token = req.cookies.refreshTokenAuth;
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

module.exports = protectRoute;
