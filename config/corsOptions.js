const allowedOrigins = [
  "http://192.168.1.108:3000",
  "http://192.168.1.1:3000",
  "http://192.168.1.111:3000",
  "http://localhost:3000",
  "https://slyder-omega.vercel.app/",
  "https://slyderback.vercel.app/",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("cors not working properly"), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
};

module.exports = corsOptions;
