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
const socketIO = require("socket.io");
const http = require("http");
const cloudinary = "./config/cloudinaryConfig";
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

const server = http.createServer(app);
const io = socketIO(server, {
  cors: corsOptions,
});

io.on("connection", (socket) => {
  console.log("socket connected");
  socket.on("send_message", (data) => {
    console.log("this is socket message", data);
  });
  socket.on("disconnect", () => {
    console.log("socket disconnected");
  });
});

mongoose.connection.once("open", () => {
  console.log("connected to database");
  server.listen(PORT, () => console.log("running on port" + PORT));
});
mongoose.connection.on("error", () => {
  console.log("server not running, database error", err);
});
