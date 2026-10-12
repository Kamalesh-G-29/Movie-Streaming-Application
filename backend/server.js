const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const connectDB = require("./config/database");

const app = express();

// Middleware
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || "http://localhost:5000,http://127.0.0.1:5000,http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "disconnected",
  });
});

// Routes
const authRoutes = require("./routes/auth");
const movieRoutes = require("./routes/movies");
const watchlistRoutes = require("./routes/watchlist");
const historyRoutes = require("./routes/history");
const reviewRoutes = require("./routes/reviews");
const userRoutes = require("./routes/user");
const compareRoutes = require("./routes/compare");
const sessionRoutes = require("./routes/sessions");
const searchHistoryRoutes = require("./routes/searchHistory");
const adminRoutes = require("./routes/admin");

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/user", userRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/search-history", searchHistoryRoutes);
app.use("/api/admin", adminRoutes);

// Serve static frontend files from workspace root
const frontendPath = path.join(__dirname, "..");
app.use(express.static(frontendPath));

// Fallback route for SPA
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err.message);
    process.exitCode = 1;
  }
}

startServer();
