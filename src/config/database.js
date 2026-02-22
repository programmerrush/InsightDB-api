const { Sequelize } = require("sequelize");
const path = require("path");
const logger = require("../utils/logger");

let sequelize;

if (process.env.APP_DB_DIALECT === "postgres") {
  sequelize = new Sequelize(
    process.env.APP_DB_NAME,
    process.env.APP_DB_USER,
    process.env.APP_DB_PASSWORD,
    {
      host: process.env.APP_DB_HOST || "localhost",
      port: process.env.APP_DB_PORT || 5432,
      dialect: "postgres",
      logging: (msg) => logger.debug(msg),
    },
  );
} else {
  // Default: SQLite (zero-config)
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../../data/insightdb.sqlite"),
    logging: (msg) => logger.debug(msg),
  });
}

module.exports = { sequelize };
