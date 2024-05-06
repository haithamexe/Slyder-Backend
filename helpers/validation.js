const User = require("../models/User");

const validEmail = (email) => {
  return email.match(
    /^([a-z\d\.-]+)@([a-z\d-]+)\.([a-z]{2,12})(\.[a-z]{2,12})?(\.[a-z]{2,8})?$/
  );
};

const validLength = (text, min, max) => {
  return text.length >= min && text.length <= max;
};

const validPassword = (password) => {
  return password.match(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/);
};

const passwordMatch = (password, passwordConfirm) => {
  return password === passwordConfirm;
};

const usernameValidation = async (username) => {
  let attempts = true;
  do {
    const exist = await User.findOne({ username: username }, "username")
      .lean()
      .exec();
    if (!exist) {
      attempts = false;
    } else {
      username = username + Math.floor(Math.random() * 1000);
    }
  } while (attempts);

  return username;
};

const registerValidation = async (body) => {
  let {
    firstName,
    surName,
    email,
    password,
    passwordConfirm,
    gender,
    year,
    month,
    day,
  } = body;

  if (
    !firstName ||
    !surName ||
    !email ||
    !password ||
    !passwordConfirm ||
    !gender ||
    !year ||
    !month ||
    !day
  ) {
    return { status: 400, message: "Please fill all fields" };
  }

  email = email.toLowerCase().trim();
  firstName = firstName.toLowerCase().trim();
  surName = surName.toLowerCase().trim();

  year = parseInt(year);
  month = parseInt(month);
  day = parseInt(day);

  if (!validEmail(email)) {
    return { status: 400, message: "invalid email" };
  }

  if (!validPassword(password)) {
    return {
      status: 400,
      message: "Password must contain at least 8 characters and 1 number",
    };
  }

  if (!validLength(firstName, 3, 15)) {
    return {
      status: 400,
      message: "First name must be between 3 and 15 characters",
    };
  }
  if (!validLength(surName, 3, 15)) {
    return {
      status: 400,
      message: "Last name must be between 3 and 15 characters",
    };
  }
  if (year < 1900 || year > new Date().getFullYear()) {
    return { status: 400, message: "Invalid year format" };
  }
  if (month < 1 || month > 12) {
    return { status: 400, message: "Invalid month format" };
  }
  if (day < 1 || day > 31) {
    return { status: 400, message: "Invalid day format" };
  }

  if (!passwordMatch(password, passwordConfirm)) {
    return { status: 400, message: "Passwords do not match" };
  }

  const existed = await User.findOne({ email: email }, "email").lean().exec();
  if (existed) {
    return { status: 409, message: "Email address is already registered" };
  }

  return null;
};

module.exports = {
  validEmail,
  validLength,
  validPassword,
  passwordMatch,
  registerValidation,
  usernameValidation,
};
