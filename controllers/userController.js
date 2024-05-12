const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { generateToken } = require("../helpers/tokens");
const { sendEmail } = require("../helpers/mailer");
const {
  registerValidation,
  usernameValidation,
  validEmail,
} = require("../helpers/validation");

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

    const user = await User.findById(accessDecoded.id).lean().exec();
    if (!user) {
      res.clearCookie("refreshToken", { path: "/api/user/" });
      return res.status(404).json({ message: "Unauthorized User" });
    }

    console.log("Authed: ", refreshDecoded.id, accessDecoded.id);

    const numberOfFollowers = user.followers.length;
    const numberOfFollowing = user.following.length;

    const data = {
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      surName: user.surName,
      verified: user.verified,
      picture: user.picture,
      cover: user.cover,
      followersNum: numberOfFollowers,
      followingNum: numberOfFollowing,
      bio: user?.details?.bio,
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

// exports.updateUser = async (req, res) => {
//   const {
//     username,
//     password,
//     email,
//     profilePic,
//     coverPic,
//     bio,
//     following,
//     followers,
//   } = req.body;
//   const id = req.params.id;
//   try {
//     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Please provide an id" });
//     }
//     const user = await User.findById(id).lean().exec();
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const updatedUser = await User.findByIdAndUpdate(id, data, {
//       new: true,
//     }).lean();
//     return res.status(200).json(updatedUser);
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// exports.getUserById = async (req, res) => {
//   try {
//     const id = req.params.id;
//     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Please provide an id" });
//     }
//     const user = await User.findById(id).lean().exec();
//     console.log(user);
//     if (user) {
//       const userdata = {
//         username: user.username,
//         firstName: user.firstName,
//         surName: user.surName,
//         verified: user.verified,
//         picture: user.picture,
//       };
//       return res.status(200).json(userdata);
//     } else {
//       return res.status(404).json({ message: "User not found" });
//     }
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// exports.getUserByUsername = async (req, res) => {
//   try {
//     const username = req.params.username;
//     if (!username) {
//       return res.status(400).json({ message: "Please provide a username" });
//     }
//     const user = await User.findOne({ username: username }).lean().exec();
//     if (user) {
//       const userdata = {
//         username: user.username,
//         firstName: user.firstName,
//         surName: user.surName,
//         verified: user.verified,
//         picture: user.picture,
//       };
//       return res.status(200).json(userdata);
//     } else {
//       return res.status(404).json({ message: "User not found" });
//     }
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// exports.getUserByEmail = async (req, res) => {
//   try {
//     const email = req.params.email;
//     if (!email) {
//       return res.status(400).json({ message: "Please provide an email" });
//     }
//     const user = await User.findOne({ email: email }).lean().exec();
//     if (user) {
//       const userdata = {
//         username: user.username,
//         firstName: user.firstName,
//         surName: user.surName,
//         verified: user.verified,
//         picture: user.picture,
//       };
//       return res.status(200).json(userdata);
//     } else {
//       return res.status(404).json({ message: "User not found" });
//     }
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) {
//       return res.status(400).json({ message: "Please provide an email" });
//     }
//     const user = await User.findOne({ email: email }).lean().exec();
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     const resetToken = generateToken({ id: user._id.toString() }, "30m");
//     const url = resetToken;
//     sendEmail(user.email, user.firstName, url);
//     return res.status(200).json({
//       message: "A reset link has been sent to your email",
//     });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// exports.resetPassword = async (req, res) => {
//   try {
//     const { token, password } = req.body;
//     if (!token || !password) {
//       return res
//         .status(400)
//         .json({ message: "Please provide a token and password" });
//     }
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (!decoded) {
//       return res.status(400).json({ message: "Invalid token" });
//     }
//     const user = await User.findById(decoded.id);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     const hashedPassword = await bcrypt.hash(password, 10);
//     user.password = hashedPassword;
//     await user.save();
//     return res.status(200).json({ message: "Password reset successful" });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };
