const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Query = sequelize.define(
  "Query",
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
    connectionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Untitled Query",
    },
    sql: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("success", "error", "running"),
      defaultValue: "success",
    },
    rowCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Execution time in ms",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    isSaved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = Query;
