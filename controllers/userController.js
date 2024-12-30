const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const Saved = require("../models/Saved");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const { io } = require("../socket");
const { sendEmail } = require("../helpers/mailer");
const {
  registerValidation,
  usernameValidation,
  validEmail,
} = require("../helpers/validation");
const cloudinary = require("../config/cloudinaryConfig");
const { invalidateUserFeedCache } = require("./postController");

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
    console.log(err);
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
        expiresIn: "365d",
      }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const accessToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_ACCESS_SECRET
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

    // Check if email is valid change
    if (!validEmail(email)) {
      return res.status(404).json({ message: "Invalid email" });
    }

    const user = await User.findOne({ email }); // lean() returns a plain JS object instead of a mongoose document  // exec() returns a promise instead of a query      // findOne() returns the first document that matches the query criteria or null if no document matches
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
        expiresIn: "365d",
      }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: "/",
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
    // console.log(req.cookies);
    const token = req?.cookies?.refreshToken;
    if (!token || token === "null") {
      return res.status(401).json({ message: "Unauthorized" + req.cookies });
    }
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      res.clearCookie("refreshToken", { path: "/" });
      return res.status(401).json({ message: "Unauthorized User" });
    }
    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: "15m",
      }
    );

    return res.status(200).json({ accessToken });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.auth = async (req, res) => {
  try {
    const accessToken = req?.body?.accessToken;
    const refreshToken = req?.cookies?.refreshToken;

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
      // res.clearCookie("refreshToken", { path: "/api/user/" });
      res.clearCookie("refreshToken", { path: "/" });
      return res
        .status(401)
        .json({ message: "Unauthorized user doesnt match" });
    }

    const user = await User.findById(accessDecoded.id).exec();
    if (!user) {
      res.clearCookie("refreshToken", { path: "/" });
      return res.status(404).json({ message: "Unauthorized User" });
    }

    console.log("Authed: ", refreshDecoded.id, accessDecoded.id);

    const data = {
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
    // res.clearCookie("refreshToken", { path: "/api/user/" });
    // res.clearCookie("refreshTokenMessage", { path: "/api/message/" });
    // res.clearCookie("refreshTokenNote", { path: "/api/note/" });
    // res.clearCookie("refreshTokenPost", { path: "/api/post/" });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
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
    const {
      username,
      firstName,
      surName,
      password,
      picture,
      cover,
      bio,
      skills,
      website,
    } = req.body;
    // console.log(req.body);

    const id = req.params.id;

    const user = await User.findById(id).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (firstName) {
      if (firstName.length < 2 || firstName.length > 20) {
        return res
          .status(400)
          .json({ message: "First Name must be between 2 and 20 characters" });
      }
      if (firstName === user.firstName) {
        return res.status(400).json({ message: "No Change" });
      }
      user.firstName = firstName;
    }

    if (surName) {
      if (surName.length < 2 || surName.length > 20) {
        return res
          .status(400)
          .json({ message: "Surname must be between 2 and 20 characters" });
      }
      if (surName === user.surName) {
        return res.status(400).json({ message: "No Change" });
      }
      user.surName = surName;
    }

    if (username) {
      const usernameExists = await User.findOne({ username: username })
        .lean()
        .exec();
      if (username === user.username) {
        return res.status(400).json({ message: "No Change" });
      }
      if (usernameExists) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = username;
    }
    if (password) {
      if (password.length < 6 || password.length > 20) {
        return res
          .status(400)
          .json({ message: "Password must be between 6 and 20 characters" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        return res.status(400).json({ message: "New password must be unique" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    if (picture) {
      if (user.picture) {
        await cloudinary.uploader.destroy(user.picture);
      }
      const cloudinaryResponse = await cloudinary.uploader.upload(picture, {
        folder: "slyder",
      });
      user.picture = cloudinaryResponse.secure_url;
    }

    if (cover) {
      if (user.cover) {
        await cloudinary.uploader.destroy(user.cover);
      }
      const cloudinaryResponse = await cloudinary.uploader.upload(cover, {
        folder: "slyder",
      });
      user.cover = cloudinaryResponse.secure_url;
    }

    if (bio) {
      user.details.bio = bio;
    }

    if (skills) {
      currentSkills = user.details.skills;
      skills.forEach((skill) => {
        if (!currentSkills.includes(skill)) {
          currentSkills.push(skill);
        }
      });
      user.details.skills = skills;
    }

    if (website) {
      user.details.website = website;
    }
    const userFollowers = await User.findById(user._id)
      .select("followers -_id")
      .exec();

    userFollowers.followers.map((follower) =>
      invalidateUserFeedCache(follower)
    );
    await invalidateUserFeedCache(user._id);

    await user.save();
    return res
      .status(200)
      .json({ message: "User updated", username: user.username });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    // const { userId } = req.params;
    // if (!userId) {
    //   return res.status(400).json({ message: "Please provide an id" });
    // }
    // const user = await User.findById(userId).lean().exec();
    // if (!user) {
    //   return res.status(404).json({ message: "User not found" });
    // }

    // const userdata = {
    //   id: user._id,
    //   username: user.username,
    //   firstName: user.firstName,
    //   surName: user.surName,
    //   picture: user.picture,
    //   cover: user.cover,
    //   bio: user?.details?.bio,
    //   skills: user?.details?.skills,
    //   website: user?.details?.website,
    // };
    // return res.status(200).json(userdata);

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(userId)
      .populate("user", "username firstName surName picture cover")
      .lean()
      .exec();
    return res.status(200).json({
      user: post,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getUserByUsername = async (req, res) => {
  try {
    console.log("ran1");
    const { username } = req.params;
    console.log("ran2");

    if (!username) {
      return res.status(400).json({ message: "Please provide a username" });
    }

    const user = await User.findOne({ username })
      .select("-password -email -contacts -notifications")
      .populate([
        {
          path: "followers",
          select: "username firstName surName picture",
        },
        {
          path: "following",
          select: "username firstName surName picture",
        },
      ])
      .lean()
      .exec();

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
      followers: user?.followers,
      following: user?.following,
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
    const { userId } = req.params;
    const { followId } = req.body;
    if (!userId || !followId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).exec();
    const followUser = await User.findById(followId).exec();

    if (!user || !followUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.following.includes(followId)) {
      return res.status(409).json({ message: "User already followed" });
    }
    user.following.push(followId);
    followUser.followers.push(userId);
    console.log(followUser.username, followId, "followed");
    console.log(user.username, userId, "user");

    // user.notifications.push({
    //   type: "follow",
    //   user: followId,
    // });

    user.contacts.push(followId);
    followUser.contacts.push(userId);

    const notification = new Notification({
      receiver: followUser._id,
      sender: user._id,
      type: "follow",
    });
    await Promise.all([user.save(), followUser.save(), notification.save()]);
    const socketNotification = {
      _id: notification._id,
      sender: {
        _id: user._id,
        username: user.username,
        picture: user.picture,
        firstName: user.firstName,
        surName: user.surName,
      },
      type: "follow",
      createdAt: notification.createdAt,
    };

    await invalidateUserFeedCache(userId);
    await invalidateUserFeedCache(followId);

    io.to(followId.toString()).emit("newNotification", socketNotification);
    // await user.save();
    // await followUser.save();
    return res.status(200).json({ message: "User followed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { unFollowId } = req.body;
    if (!userId || !unFollowId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).exec();
    const unFollowUser = await User.findById(unFollowId).exec();

    if (!user || !unFollowUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.following.includes(unFollowId)) {
      return res.status(409).json({ message: "User already unfollowed" });
    }
    user.following = user.following.filter(
      (user) => user.toString() !== unFollowId
    );
    unFollowUser.followers = unFollowUser.followers.filter(
      (user) => user.toString() !== userId
    );
    console.log(unFollowUser.username, unFollowId, "unfollowed");
    console.log(user.username, userId, "user");
    await Promise.all([user.save(), unFollowUser.save()]);

    await invalidateUserFeedCache(userId);
    await invalidateUserFeedCache(unFollowId);

    return res.status(200).json({ message: "User unfollowed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId)
      .select("following")
      .populate({
        path: "following",
        select: "username firstName surName picture",
      })
      .lean()
      .exec(); // lean() returns a plain JS object instead of a mongoose document  // exec() returns a promise instead of a query      // findOne() returns the first document that matches the query criteria or null if no document matches
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // console.log(user.following);
    return res.status(200).json(user.following);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId)
      .select("followers")
      .populate({
        path: "followers",
        select: "username firstName surName picture",
      })
      .lean()
      .exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user.followers);
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

exports.getUserContacts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).lean().exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userContacts = user?.contacts;
    return res.status(200).json(userContacts);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getUserSearched = async (req, res) => {
  try {
    const { query } = req.params;
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

    if (!users) {
      return res.status(404).json({ message: "No users found" });
    }
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
