/**
 * Vercel Serverless Function entry point
 * Exports the Express app as a serverless handler
 */
require("dotenv").config();
const { sequelize } = require("../src/config/database");
const app = require("../src/app");

// Sync DB once on cold start
let dbReady = false;
const initDB = async () => {
  if (!dbReady) {
    await sequelize.sync({ alter: true });
    dbReady = true;
  }
};

// Wrap app to ensure DB is ready before handling requests
module.exports = async (req, res) => {
  await initDB();
  return app(req, res);
};
