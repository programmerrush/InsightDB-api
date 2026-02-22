const ChatMessage = require("../../models/ChatMessage");
const connectionService = require("../connection/connection.service");
const DbConnector = require("../../utils/dbConnector");
const { v4: uuidv4 } = require("uuid");

class ChatService {
  /**
   * Send a message and get AI response
   * If no OpenAI API key is configured, it generates a rule-based response
   */
  async sendMessage(userId, { connectionId, message, sessionId }) {
    const session = sessionId || uuidv4();

    // Save user message
    await ChatMessage.create({
      userId,
      connectionId,
      role: "user",
      content: message,
      sessionId: session,
    });

    // Generate response
    let responseContent;
    let metadata = null;

    try {
      // Check if we have a database connection for context
      if (connectionId) {
        const creds = await connectionService.getCredentials(
          userId,
          connectionId,
        );
        metadata = {
          connectionId,
          dbType: creds.dbType,
          database: creds.database,
        };

        // Determine intent and generate contextual response
        responseContent = await this.generateContextualResponse(message, creds);
      } else {
        responseContent = this.generateGenericResponse(message);
      }
    } catch (error) {
      responseContent = `I encountered an issue while analyzing your data: ${error.message}. Could you try rephrasing your question?`;
    }

    // Save assistant message
    const assistantMessage = await ChatMessage.create({
      userId,
      connectionId,
      role: "assistant",
      content: responseContent,
      metadata,
      sessionId: session,
    });

    return {
      sessionId: session,
      message: assistantMessage,
    };
  }

  /**
   * Generate a response with database context
   */
  async generateContextualResponse(message, creds) {
    const lowerMsg = message.toLowerCase();

    // Detect intent: schema/table listing
    if (
      lowerMsg.includes("table") &&
      (lowerMsg.includes("list") ||
        lowerMsg.includes("show") ||
        lowerMsg.includes("what"))
    ) {
      const tables = await DbConnector.getTables(creds.dbType, creds);
      const tableList = tables.rows
        .map(
          (t) =>
            `• **${t.table_name}** (${t.estimated_rows || "?"} rows, ${t.size})`,
        )
        .join("\n");
      return `Here are the tables in your database:\n\n${tableList}\n\nWould you like me to analyze any specific table?`;
    }

    // Detect intent: column info
    if (
      lowerMsg.includes("column") ||
      lowerMsg.includes("schema") ||
      lowerMsg.includes("structure")
    ) {
      const tableMatch = message.match(/(?:for|of|in|from)\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        try {
          const columns = await DbConnector.getTableColumns(
            creds.dbType,
            creds,
            tableName,
          );
          const colList = columns.rows
            .map(
              (c) =>
                `• **${c.column_name}** (${c.data_type}) ${c.constraint_type ? `[${c.constraint_type}]` : ""}`,
            )
            .join("\n");
          return `Schema for **${tableName}**:\n\n${colList}`;
        } catch (e) {
          return `I couldn't find a table named "${tableName}". Please check the table name and try again.`;
        }
      }
    }

    // Detect intent: row count / stats
    if (
      lowerMsg.includes("count") ||
      lowerMsg.includes("how many") ||
      lowerMsg.includes("total")
    ) {
      const tableMatch = message.match(/(?:in|from|for)\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        try {
          const result = await DbConnector.executeQuery(
            creds.dbType,
            creds,
            `SELECT count(*) as total FROM "${tableName}"`,
          );
          return `The **${tableName}** table has **${result.rows[0].total}** rows.`;
        } catch (e) {
          return `I couldn't count rows in "${tableName}": ${e.message}`;
        }
      }
    }

    // Detect intent: SQL generation
    if (
      lowerMsg.includes("query") ||
      lowerMsg.includes("sql") ||
      lowerMsg.includes("select") ||
      lowerMsg.includes("write")
    ) {
      return `I can help you write SQL queries! Here's an example based on your request:\n\n\`\`\`sql\nSELECT * FROM your_table\nWHERE condition = 'value'\nORDER BY created_at DESC\nLIMIT 10;\n\`\`\`\n\nTell me more about what data you need, and I'll customize this for your schema.`;
    }

    // Detect intent: trends / analysis
    if (
      lowerMsg.includes("trend") ||
      lowerMsg.includes("sales") ||
      lowerMsg.includes("growth") ||
      lowerMsg.includes("revenue")
    ) {
      return `To analyze trends, I need to know:\n\n1. Which **table** contains your data?\n2. Which **date column** to use for the time axis?\n3. Which **value column** to aggregate?\n\nFor example: "Show me monthly trends from the orders table using created_at and total_amount"`;
    }

    // Default response
    return `I'm your InsightDB data assistant. I can help you:\n\n• **Explore schemas** — "Show me all tables"\n• **Analyze data** — "What columns are in orders?"\n• **Write SQL** — "Write a query for top customers"\n• **Get insights** — "Show trends for sales data"\n\nWhat would you like to know about your database?`;
  }

  /**
   * Generic response without database context
   */
  generateGenericResponse(message) {
    return `I'd love to help! To provide data-specific insights, please connect to a database first. I can assist with:\n\n• Schema exploration\n• SQL query generation\n• Data quality analysis\n• Trend identification\n\nConnect a database and ask me anything!`;
  }

  /**
   * Get chat history for a session
   */
  async getSessionHistory(userId, sessionId) {
    return await ChatMessage.findAll({
      where: { userId, sessionId },
      order: [["createdAt", "ASC"]],
    });
  }

  /**
   * Get all chat sessions for a user
   */
  async getSessions(userId) {
    const messages = await ChatMessage.findAll({
      where: { userId },
      attributes: ["sessionId", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    // Group by session
    const sessions = {};
    for (const msg of messages) {
      if (!sessions[msg.sessionId]) {
        sessions[msg.sessionId] = {
          sessionId: msg.sessionId,
          lastMessageAt: msg.createdAt,
        };
      }
    }

    return Object.values(sessions);
  }

  /**
   * Delete a chat session
   */
  async deleteSession(userId, sessionId) {
    await ChatMessage.destroy({
      where: { userId, sessionId },
    });
    return { message: "Chat session deleted" };
  }
}

module.exports = new ChatService();
