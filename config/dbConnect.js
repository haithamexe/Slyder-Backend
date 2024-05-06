const mongoose = require("mongoose");

const dbConnect = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
    });
  } catch (err) {
    console.log(err, "failed to connect");
  }
};

module.exports = dbConnect;
