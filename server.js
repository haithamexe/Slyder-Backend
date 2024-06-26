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

// const errorHandler = require("./middleware/errorHandler");
// const verifyJWT = require("./middleware/verifyJWT");
// const cookieParser = require("cookie-parser");
// const credentials = require("./middleware/credentials");

const PORT = process.env.PORT || 8000;

dbConnect();
// const app = express();
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("<h1>running</h1>");
});
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/post", require("./routes/postRoutes"));
app.use("/api/message", require("./routes/messageRoutes"));
app.use("/api/note", require("./routes/noteRoutes"));
app.use("/api/notification", require("./routes/notificationRoutes"));
// app.use("/api/notification", require("./routes/notificationRoutes"));
// app.use("/api/room", require("./routes/roomRoutes"));

app.use(logger);
app.use(errorHandler);
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Bad JSON");
  }
  if (err.type === "entity.too.large") {
    console.error("Request entity too large");
  }
  next();
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

mongoose.connection.once("open", () => {
  console.log("connected to database");
  server.listen(PORT, () => console.log("running on port" + PORT));
});
mongoose.connection.on("error", () => {
  console.log("server not running, database error", err);
});
