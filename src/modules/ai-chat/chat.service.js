const ChatMessage = require("../../models/ChatMessage");
const connectionService = require("../connection/connection.service");
const DbConnector = require("../../utils/dbConnector");
const { v4: uuidv4 } = require("uuid");
const { GoogleGenerativeAI } = require("@google/generative-ai");

class ChatService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      console.log("✅ Gemini AI initialized");
    } else {
      this.genAI = null;
      this.model = null;
      console.warn(
        "⚠️  GEMINI_API_KEY not set — AI chat will use fallback responses",
      );
    }
  }

  /**
   * Send a message and get AI response powered by Gemini
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
      // Gather database context if connected
      let dbContext = null;
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
        dbContext = await this.gatherDatabaseContext(creds);
      }

      // Get conversation history for context
      const history = await this.getRecentHistory(userId, session);

      // Generate response via Gemini or fallback
      if (this.model) {
        responseContent = await this.generateGeminiResponse(
          message,
          dbContext,
          history,
        );
      } else {
        responseContent = this.generateFallbackResponse(message, dbContext);
      }
    } catch (error) {
      console.error("Chat error:", error.message);
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
   * Gather database schema context for Gemini
   */
  async gatherDatabaseContext(creds) {
    try {
      const tablesResult = await DbConnector.getTables(creds.dbType, creds);
      const tables = tablesResult.rows.slice(0, 20); // limit to 20 tables

      const tableSchemas = [];
      for (const table of tables.slice(0, 8)) {
        // Get columns for top 8 tables
        try {
          const cols = await DbConnector.getTableColumns(
            creds.dbType,
            creds,
            table.table_name,
          );
          tableSchemas.push({
            name: table.table_name,
            rows: table.estimated_rows || "?",
            size: table.size,
            columns: cols.rows.map((c) => ({
              name: c.column_name,
              type: c.data_type,
              nullable: c.is_nullable,
              key: c.constraint_type || null,
            })),
          });
        } catch (e) {
          tableSchemas.push({
            name: table.table_name,
            rows: table.estimated_rows || "?",
            size: table.size,
            columns: [],
          });
        }
      }

      return {
        dbType: creds.dbType,
        database: creds.database,
        tableCount: tables.length,
        tables: tableSchemas,
      };
    } catch (e) {
      return {
        dbType: creds.dbType,
        database: creds.database,
        error: e.message,
      };
    }
  }

  /**
   * Get recent conversation history for context
   */
  async getRecentHistory(userId, sessionId) {
    const messages = await ChatMessage.findAll({
      where: { userId, sessionId },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });
    return messages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  /**
   * Generate response using Gemini API (with retry for rate limits)
   */
  async generateGeminiResponse(message, dbContext, history, retries = 2) {
    const systemPrompt = this.buildSystemPrompt(dbContext);

    // Build conversation contents for Gemini
    const contents = [];

    // Add history as alternating user/model messages
    for (const msg of history) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.model.generateContent({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 2048,
          },
        });

        const response = result.response;
        return response.text();
      } catch (error) {
        const is429 =
          error.status === 429 ||
          error.message?.includes("429") ||
          error.message?.includes("Too Many Requests") ||
          error.message?.includes("quota");

        if (is429 && attempt < retries) {
          // Wait before retrying (exponential backoff: 5s, 15s)
          const delay = (attempt + 1) * 5000 + Math.random() * 2000;
          console.warn(
            `Gemini rate limited — retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${retries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (is429) {
          // All retries exhausted — return friendly fallback
          console.warn(
            "Gemini rate limit — falling back to rule-based response",
          );
          return this.generateFallbackResponse(message, dbContext);
        }

        throw error;
      }
    }
  }

  /**
   * Build system prompt with database context
   */
  buildSystemPrompt(dbContext) {
    let prompt = `You are InsightDB's AI data assistant — an expert in databases, SQL, data analysis, and schema design.

Key behaviors:
- Be concise, helpful, and technically accurate
- Use markdown formatting for readability (bold, code blocks, bullet points)
- When writing SQL, always use proper syntax for the connected database type
- If the user asks about data you don't have, suggest how they can explore it
- Provide actionable insights and recommendations when analyzing schemas
- Never fabricate data — only reference actual schema information provided below
`;

    if (dbContext && !dbContext.error) {
      prompt += `\n## Connected Database Context
- **Database Type**: ${dbContext.dbType}
- **Database Name**: ${dbContext.database}
- **Total Tables**: ${dbContext.tableCount}

### Schema Details:
`;
      for (const table of dbContext.tables) {
        prompt += `\n**${table.name}** (~${table.rows} rows, ${table.size || "N/A"}):\n`;
        if (table.columns.length > 0) {
          for (const col of table.columns) {
            prompt += `  - \`${col.name}\` ${col.type}${col.key ? ` [${col.key}]` : ""}${col.nullable === "YES" ? " (nullable)" : ""}\n`;
          }
        }
      }

      prompt += `\nUse this schema to write accurate SQL queries and provide data-specific insights. Reference actual table and column names.`;
    } else if (dbContext?.error) {
      prompt += `\nNote: Could not fetch database schema (${dbContext.error}). Provide general database guidance.`;
    } else {
      prompt += `\nNo database is currently connected. Help the user with general database questions and suggest connecting a database for specific insights.`;
    }

    return prompt;
  }

  /**
   * Fallback response when Gemini API is not available
   */
  generateFallbackResponse(message, dbContext) {
    if (!dbContext) {
      return `I'd love to help! To provide data-specific insights, please connect to a database first. I can assist with:\n\n• Schema exploration\n• SQL query generation\n• Data quality analysis\n• Trend identification\n\nConnect a database and ask me anything!`;
    }

    const lowerMsg = message.toLowerCase();

    if (
      lowerMsg.includes("table") &&
      (lowerMsg.includes("list") ||
        lowerMsg.includes("show") ||
        lowerMsg.includes("what"))
    ) {
      const tableList = dbContext.tables
        .map((t) => `• **${t.name}** (~${t.rows} rows)`)
        .join("\n");
      return `Here are the tables in your **${dbContext.database}** database:\n\n${tableList}\n\nWould you like me to analyze any specific table?`;
    }

    return `I'm your InsightDB data assistant. I can help you:\n\n• **Explore schemas** — "Show me all tables"\n• **Analyze data** — "What columns are in orders?"\n• **Write SQL** — "Write a query for top customers"\n• **Get insights** — "Show trends for sales data"\n\nWhat would you like to know about your **${dbContext.database}** database?`;
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
