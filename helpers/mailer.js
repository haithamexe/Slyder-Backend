const { google } = require("googleapis");
// const { oauth2 } = require("googleapis/build/src/apis/oauth2");
const { OAuth2 } = google.auth;
const nodemailer = require("nodemailer");

const OAUTH_PLAYGROUND = "https://developers.google.com/oauthplayground";
const { EMAIL, MAILING_ID, MAILING_REFRESH, MAILING_SECRET, MAILING_ACCESS } =
  process.env;

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "slyderappmail@gmail.com",
    pass: "fpctfifefhmsywuc",
  },
});

exports.sendEmail = (email, name, token) => {
  const mailOptions = {
    from: "slyderappmail@gmail.com",
    to: email,
    subject: "Email verification",
    html:
      "<h1>Hello, " +
      name +
      ", Click on the link below to verify your email</h1><br><a target='_blank' href='" +
      process.env.BASE_URL +
      "/activate/" +
      token +
      "'>Click here to verify</a>",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error in sending email  " + error);
      return true;
    } else {
      console.log("Email sent: " + info.response);
      return false;
    }
  });
};

exports.sendReset = (email, name, token) => {
  const mailOptions = {
    from: "slyderappmail@gmail.com",
    to: email,
    subject: "Password reset",
    html:
      "<h1>Hello, " +
      name +
      ", Click on the link below to reset your password</h1><br><a target='_blank' href='" +
      process.env.BASE_URL +
      "/reset/" +
      token +
      "'>Click here to reset</a>",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error in sending email  " + error);
      return true;
    } else {
      console.log("Email sent: " + info.response);
      return false;
    }
  });
};
