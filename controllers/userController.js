const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const Saved = require("../models/Saved");
const { generateToken } = require("../helpers/tokens");
const { sendEmail } = require("../helpers/mailer");
const {
  registerValidation,
  usernameValidation,
  validEmail,
} = require("../helpers/validation");
const cloudinary = require("../config/cloudinaryConfig");

exports.register = async (req, res) => {
  try {
    let {
      firstName,
      surName,
      email,
      password,
      gender,
      pronoun,
      year,
      month,
      day,
    } = req.body;

    const regValidation = await registerValidation(req.body);
    if (regValidation) {
      return res
        .status(regValidation.status)
        .json({ message: regValidation.message });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS)
    );

    email = email.toLowerCase().trim();
    firstName = firstName.toLowerCase().trim();
    surName = surName.toLowerCase().trim();
    password = hashedPassword;
    year = parseInt(year);
    month = parseInt(month);
    day = parseInt(day);
    const username = await usernameValidation(firstName + surName);

    const user = await new User({
      firstName,
      surName,
      username,
      email,
      password,
      gender,
      pronoun,
      year,
      month,
      day,
    });

    await user.save();
    console.log(user);

    if (user) {
      const TokenUrl = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_SECRET_VERIFICATION,
        {
          expiresIn: "30m",
        }
      );
      sendEmail(user.email, user.firstName, TokenUrl);

      console.log("Token: " + TokenUrl, email);

      return res.status(200).json({
        message: "Registration is successful, please check your email",
      });
    }
    return res.status(200).json({ message: "Registration is successful" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.activateAccount = async (req, res) => {
  try {
    const { token } = req.body;
    console.log("Token", token, req.body);
    const decoded = jwt.verify(token, process.env.JWT_SECRET_VERIFICATION);
    if (!decoded) {
      return res.status(400).json({ message: "Invalid token" });
    }
    const user = await User.findById(decoded.id).exec();
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }
    if (user.verified) {
      return res.status(409).json({ message: "Account already verified" });
    }

    user.verified = true;
    await user.save();

    const refreshToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "1y",
      }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: "/api/user/",
    });

    const accessToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: "15m",
      }
    );

    return res.status(200).json({
      accessToken,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message, err });
  }
};

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    console.log(req.body);
    console.log(req.cookies);
    // console.log(req);

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    email = email.toLowerCase().trim();

    if (!validEmail(email)) {
      return res.status(404).json({ message: "Invalid email" });
    }

    const user = await User.findOne({ email: email }); // lean() returns a plain JS object instead of a mongoose document  // exec() returns a promise instead of a query      // findOne() returns the first document that matches the query criteria or null if no document matches
    if (!user) {
      return res.status(404).json({ message: "Invalid Email or Password" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(404).json({ message: "Invalid Email or Password" });
    }

    if (!user.verified) {
      const tokenUrl = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_SECRET_VERIFICATION,
        {
          expiresIn: "30m",
        }
      );

      sendEmail(user.email, user.firstName, tokenUrl);

      return res.status(409).json({
        message:
          "Account is not verified, an email have been sent to verify your account",
      });
    }

    if (user.suspended) {
      return res.status(401).json({ message: "User is suspended" });
    }

    const refreshToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "1y",
      }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: "/api/user/",
    });

    const accessToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: "15m",
      }
    );

    return res.status(200).json({
      accessToken,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    console.log(req.cookies);
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" + req.cookies });
    }
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      res.clearCookie("refreshToken", { path: "/api/user/" });
      return res.status(401).json({ message: "Unauthorized User" });
    }
    const accessToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: "15m",
      }
    );

    return res.status(200).json({ accessToken });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

exports.auth = async (req, res) => {
  try {
    const accessToken = req.body.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken || !refreshToken) {
      return res.status(404).json({ message: "Unauthorized no Tokens" });
    }

    const refreshDecoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );
    const accessDecoded = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET
    );

    if (refreshDecoded.id !== accessDecoded.id) {
      res.clearCookie("refreshToken", { path: "/api/user/" });
      return res
        .status(401)
        .json({ message: "Unauthorized user doesnt match" });
    }

    const user = await User.findById(accessDecoded.id).exec();
    if (!user) {
      res.clearCookie("refreshToken", { path: "/api/user/" });
      return res.status(404).json({ message: "Unauthorized User" });
    }

    console.log("Authed: ", refreshDecoded.id, accessDecoded.id);

    const followersNum = user.followers.length;
    const followingNum = user.following.length;

    if (!user.picture) {
      user.picture =
        "https://res.cloudinary.com/dcfy1isux/image/upload/f_auto,q_auto/placeholder-pic";
    }

    user.details.skills = ["football", "coding", "art"];
    user.details.bio = "Hello World";

    await user.save();

    const data = {
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      surName: user.surName,
      verified: user.verified,
      picture: user.picture,
      cover: user.cover,
      followersNum: followersNum,
      followingNum: followingNum,
      bio: user?.details?.bio,
      skills: user?.details?.skills,
      website: user?.details?.website,
      gender: user?.details?.gender,
      pronoun: user?.details?.pronoun,
      year: user?.details?.year,
      month: user?.details?.month,
      day: user?.details?.day,
    };
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("refreshToken", { path: "/api/user/" });
    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.refreshActivationToken = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body);
    if (!email) {
      return res.status(400).json({ message: "Please provide an email" });
    }
    const user = await User.findOne({ email }).lean().exec();
    if (!user) {
      return res
        .status(200)
        .json({ message: "Email have been sent to this email address" });
    }

    if (user.verified) {
      return res
        .status(200)
        .json({ message: "Email have been sent to this email address" });
    }

    const TokenUrl = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET_VERIFICATION,
      {
        expiresIn: "30m",
      }
    );

    sendEmail(user.email, user.firstName, TokenUrl);

    return res.status(200).json({
      message: "A verification link has been sent to your email",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { username, password, profilePic, coverPic, bio, skills, website } =
      req.body;

    const id = req.params.id;

    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username) {
      const usernameExists = await User.findOne({ username: username })
        .lean()
        .exec();
      if (usernameExists) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = username;
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    if (profilePic) {
      await cloudinary.uploader.destroy(user.picture);
      const profile = await cloudinary.uploader.upload(profilePic, {
        upload_preset: "slyder",
      });

      user.picture = profile.secure_url;
    }

    if (coverPic) {
      await cloudinary.uploader.destroy(user.cover);
      const cover = await cloudinary.uploader.upload(coverPic, {
        upload_preset: "slyder",
      });

      user.cover = cover.secure_url;
    }

    if (bio) {
      user.details.bio = bio;
    }

    if (skills) {
      user.details.skills = skills;
    }

    if (website) {
      user.details.website = website;
    }

    await user.save();
    return res.status(200).json({ message: "User updated" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(id).lean().exec();
    // console.log(user);
    if (!user.picture) {
      user.picture =
        "https://res.cloudinary.com/dcfy1isux/image/upload/f_auto,q_auto/placeholder-pic";
    }
    if (user) {
      const userdata = {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        surName: user.surName,
        picture: user.picture,
        cover: user.cover,
        bio: user.details.bio,
        skills: user.details.skills,
        website: user.details.website,
      };
      return res.status(200).json(userdata);
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    console.log("ran");

    if (!username) {
      return res.status(400).json({ message: "Please provide a username" });
    }

    const user = await User.findOne({ username }).exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.picture) {
      user.picture =
        "https://res.cloudinary.com/dcfy1isux/image/upload/f_auto,q_auto/placeholder-pic";
    }

    const userdata = {
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      surName: user.surName,
      verified: user.verified,
      picture: user.picture,
      cover: user.cover,
      bio: user?.details?.bio,
      skills: user?.details?.skills,
      website: user?.details?.website,
      followersNum: user.followers.length,
      followingNum: user.following.length,
    };

    return res.status(200).json(userdata);
  } catch (err) {
    console.error(err); // Log the error for debugging purposes
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Please provide an email" });
    }
    const user = await User.findOne({ email: email }).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "Email Sent" });
    }
    const resetToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET_RESET,
      {
        expiresIn: "30m",
      }
    );
    const url = resetToken;
    sendEmail(user.email, user.firstName, url);
    return res.status(200).json({
      message: "A reset link has been sent to your email",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Please provide a token" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_RESET);
    if (!decoded) {
      return res.status(400).json({ message: "Invalid token" });
    }
    const user = await User.findById(decoded.id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    return res.status(200).json({ message: "Password updated" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findByIdAndDelete(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.suspended = true;
    await user.save();
    return res.status(200).json({ message: "User suspended" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.unsuspendUser = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.suspended = false;
    await user.save();
    return res.status(200).json({ message: "User unsuspended" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.followUser = async (req, res) => {
  try {
    const { id, followId } = req.body;
    if (!id || !followId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(id).exec();
    const followUser = await User.findById(followId).exec();
    if (!user || !followUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.following.includes(followId)) {
      return res.status(409).json({ message: "User already followed" });
    }
    user.following.push(followId);
    followUser.followers.push(id);
    await user.save();
    await followUser.save();
    return res.status(200).json({ message: "User followed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const { id, followId } = req.body;
    if (!id || !followId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(id).exec();
    const followUser = await User.findById(followId).exec();
    if (!user || !followUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.following.includes(followId)) {
      return res.status(409).json({ message: "User not followed" });
    }
    user.following = user.following.filter((item) => item !== followId);
    followUser.followers = followUser.followers.filter((item) => item !== id);
    await user.save();
    await followUser.save();
    return res.status(200).json({ message: "User unfollowed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const followers = await User.find({ _id: { $in: user.followers } })
      .select("username firstName surName picture")
      .lean()
      .exec();
    return res.status(200).json(followers);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const following = await User.find({ _id: { $in: user.following } })
      .select("username firstName surName picture")
      .lean()
      .exec();
    return res.status(200).json(following);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.searchUser = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: "Please provide a query" });
    }
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { firstName: { $regex: query, $options: "i" } },
        { surName: { $regex: query, $options: "i" } },
      ],
    })
      .select("username firstName surName picture")
      .lean()
      .exec();
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("picture username firstName surName _id")
      .lean()
      .exec();
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateUserEmail = async (req, res) => {
  try {
    const { id, email } = req.body;
    if (!id || !email) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (email === user.email) {
      return res.status(409).json({ message: "Email already in use" });
    }

    sendEmail(email, user.firstName, "new email verification link");
    user.email = email;
    await user.save();
    return res.status(200).json({ message: "Email updated" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateUserPassword = async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!id || !password) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    return res.status(200).json({ message: "Password updated" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// exports.getPostsByUser = async (req, res) => {
//   try {
//     const { id } = req.body;
//     if (!id) {
//       return res.status(400).json({ message: "Please provide an id" });
//     }
//     const posts = await Post.find({ user: id })
//       .select("title description image")
//       .lean()
//       .exec();
//     return res.status(200).json(posts);
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };
