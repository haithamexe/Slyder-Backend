const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const protectRoute = async (req, res, next) => {
  try {
    // console.log("Token from cookie", req.cookies.refreshToken);
    let token;
    // console.log(req);
    if (req.cookies.refreshToken) {
      token = req.cookies.refreshToken;
      // console.log("Token from cookie", token);
      // console.log("Token from cookie", req.cookies);
    }
    if (!token) {
      return res.status(401).json({
        message: "You are not authorized to access this route no token",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (!decoded) {
      return res.status(401).json({
        message: "You are not authorized to access this route token failed",
      });
    }
    const user = await User.findById(decoded.id).exec();
    if (!user) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
      });
      return res.status(401).json({
        message: "You are not authorized to access this route no user",
      });
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
