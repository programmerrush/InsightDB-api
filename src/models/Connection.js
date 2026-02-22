const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Connection = sequelize.define(
  "Connection",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dbType: {
      type: DataTypes.ENUM("postgresql", "mysql"),
      allowNull: false,
      defaultValue: "postgresql",
    },
    host: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    database: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Encrypted password stored here
    encryptedPassword: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ssl: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastConnectedAt: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = Connection;
