const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const pickupRoutes = require("./routes/pickupRoutes");
const crewRoutes = require("./routes/crewRoutes");
const crewSelfRoutes = require("./routes/crewSelfRoutes");
const routeRoutes = require("./routes/routeRoutes");

// Load environment variables from .env
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ── Middleware ──────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback for deployment testing
    },
    credentials: true,
  })
);
app.use(express.json());   // Parse incoming JSON request bodies

// ── Health Check ────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    success: true,
    message: "EcoSaathi API is running",
  });
});

// ── API Routes ──────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", pickupRoutes);
app.use("/api/crews", crewRoutes);
app.use("/api/crew", crewSelfRoutes);
app.use("/api/routes", routeRoutes);

// ── 404 Handler (unknown routes) ────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── Centralized Error Handler ────────────────────────────
// Must be registered AFTER all routes
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`EcoSaathi API running on port ${PORT}`);
});
