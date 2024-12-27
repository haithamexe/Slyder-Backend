const allowedOrigins = [
  "http://localhost:3000",
  "https://slyder-omega.vercel.app/",
  "https://slyderback.vercel.app/",
];

const corsOptions = {
  origin: "*",
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
};

module.exports = corsOptions;
