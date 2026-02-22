const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const crypto = require("crypto");

const ApiKey = sequelize.define(
  "ApiKey",
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
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    prefix: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "First 8 chars for display",
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: ["read"],
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    expiresAt: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Generate a new API key
 */
ApiKey.generateKey = function () {
  const key = `idb_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = key.substring(0, 12);
  return { key, prefix };
};

module.exports = ApiKey;
