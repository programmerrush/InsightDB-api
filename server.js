require("dotenv").config();
const app = require("./src/app");
const { sequelize } = require("./src/config/database");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Sync database models
    await sequelize.sync({ alter: true });
    logger.info("Database synced successfully");

    app.listen(PORT, () => {
      logger.info(`InsightDB Backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`API Docs: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
