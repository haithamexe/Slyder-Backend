require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { readdirSync } = require("fs");
const mongoose = require("mongoose");
const corsOptions = require("./config/corsOptions");
const dbConnect = require("./config/dbConnect");
const path = require("path");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/errorHandler");
const { logger } = require("./middleware/logEvents");
// const errorHandler = require("./middleware/errorHandler");
// const verifyJWT = require("./middleware/verifyJWT");
// const cookieParser = require("cookie-parser");
// const credentials = require("./middleware/credentials");

const PORT = process.env.PORT || 8000;

dbConnect();
const app = express();
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("<h1>running</h1>");
});
app.use("/api/user", require("./routes/userRoutes"));

app.use(logger);
app.use(errorHandler);

mongoose.connection.once("open", () => {
  console.log("connected to database");
  app.listen(PORT, () => console.log("running on port" + PORT));
});
mongoose.connection.on("error", () => {
  console.log("server not running, database error", err);
});
