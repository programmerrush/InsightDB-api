const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ChatMessage = sequelize.define(
  "ChatMessage",
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
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("user", "assistant", "system"),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: null,
      comment: "Any structured data like charts, SQL, analysis results",
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Groups messages in a conversation session",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = ChatMessage;
