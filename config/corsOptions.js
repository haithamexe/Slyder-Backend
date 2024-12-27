const allowedOrigins = [
  "http://localhost:3000",
  "https://slyder-backend.onrender.com",
  "https://slyder-omega.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, origin); // Return the specific origin
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
