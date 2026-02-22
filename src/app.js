const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const logger = require("./utils/logger");

// Import route modules
const authRoutes = require("./modules/auth/auth.routes");
const connectionRoutes = require("./modules/connection/connection.routes");
const explorerRoutes = require("./modules/explorer/explorer.routes");
const queriesRoutes = require("./modules/queries/queries.routes");
const insightsRoutes = require("./modules/insights/insights.routes");
const chatRoutes = require("./modules/ai-chat/chat.routes");
const securityRoutes = require("./modules/security/security.routes");
const profileRoutes = require("./modules/profile/profile.routes");
const settingsRoutes = require("./modules/settings/settings.routes");

const app = express();

// --------------- Middleware ---------------
app.use(helmet());
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }),
);

// --------------- Health Check ---------------
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "InsightDB Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// --------------- API Routes ---------------
app.use("/api/auth", authRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/explorer", explorerRoutes);
app.use("/api/queries", queriesRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/settings", settingsRoutes);

// --------------- Error Handling ---------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
