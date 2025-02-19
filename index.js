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
const bodyParser = require("body-parser");
const { app, server } = require("./socket");
const setupCronJobs = require("./helpers/cronJobs");

// const errorHandler = require("./middleware/errorHandler");
// const verifyJWT = require("./middleware/verifyJWT");
// const cookieParser = require("cookie-parser");
// const credentials = require("./middleware/credentials");

const PORT = process.env.PORT || 8000;

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
dbConnect();
app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());

//need to look around for the correct path
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

setupCronJobs();

// app.use(verifyJWT);
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "api-info.html"));
});
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/post", require("./routes/postRoutes"));
app.use("/api/message", require("./routes/messageRoutes"));
app.use("/api/note", require("./routes/noteRoutes"));
app.use("/api/notification", require("./routes/notificationRoutes"));
app.use("*", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "404.html"));
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Bad JSON");
  }
  if (err.type === "entity.too.large") {
    console.error("Request entity too large");
  }
  next();
});

mongoose.connection.once("open", () => {
  console.log("connected to database");
  server.listen(PORT, () => console.log("running on port " + PORT));
});
mongoose.connection.on("error", () => {
  console.log("server not running, database error", err);
});

// const server = http.createServer(app);
// const io = socketIO(server, {
//   cors: corsOptions,
// });

// io.on("connection", (socket) => {
//   console.log("socket connected");
//   socket.on("send_message", (data) => {
//     console.log("this is socket message", data);
//   });
//   socket.on("disconnect", () => {
//     console.log("socket disconnected");
//   });
// });
