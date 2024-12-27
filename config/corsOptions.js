const allowedOrigins = [
  "http://localhost:3000",
  "https://slyder-omega.vercel.app/",
  "https://slyderback.vercel.app/",
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
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
};

module.exports = corsOptions;
