const Query = require("../../models/Query");
const connectionService = require("../connection/connection.service");
const DbConnector = require("../../utils/dbConnector");
const AuditLog = require("../../models/AuditLog");

class QueriesService {
  /**
   * Execute a SQL query on a user's database
   */
  async executeQuery(userId, { connectionId, sql, title }) {
    const creds = await connectionService.getCredentials(userId, connectionId);

    let queryRecord;
    try {
      const result = await DbConnector.executeQuery(creds.dbType, creds, sql);

      // Save to history
      queryRecord = await Query.create({
        userId,
        connectionId,
        title: title || "Untitled Query",
        sql,
        status: "success",
        rowCount: result.rowCount || 0,
        duration: result.duration || 0,
      });

      await AuditLog.create({
        userId,
        action: "EXECUTE_QUERY",
        resource: "query",
        resourceId: queryRecord.id,
        details: { sql: sql.substring(0, 500), duration: result.duration },
      });

      return {
        queryId: queryRecord.id,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields,
        duration: result.duration,
        status: "success",
      };
    } catch (error) {
      // Save failed query to history
      queryRecord = await Query.create({
        userId,
        connectionId,
        title: title || "Untitled Query",
        sql,
        status: "error",
        errorMessage: error.message,
      });

      const err = new Error(`Query execution failed: ${error.message}`);
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Save a query (bookmark it)
   */
  async saveQuery(userId, { connectionId, sql, title }) {
    const query = await Query.create({
      userId,
      connectionId,
      title,
      sql,
      isSaved: true,
      status: "success",
    });
    return query;
  }

  /**
   * Get query history
   */
  async getHistory(userId, { page = 1, limit = 20, connectionId } = {}) {
    const where = { userId };
    if (connectionId) where.connectionId = connectionId;

    const offset = (page - 1) * limit;
    const { count, rows } = await Query.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return {
      queries: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    };
  }

  /**
   * Get saved queries
   */
  async getSavedQueries(userId, connectionId) {
    const where = { userId, isSaved: true };
    if (connectionId) where.connectionId = connectionId;

    return await Query.findAll({
      where,
      order: [["updatedAt", "DESC"]],
    });
  }

  /**
   * Get a single query by ID
   */
  async getQueryById(userId, queryId) {
    const query = await Query.findOne({
      where: { id: queryId, userId },
    });
    if (!query) {
      const error = new Error("Query not found");
      error.statusCode = 404;
      throw error;
    }
    return query;
  }

  /**
   * Delete a query
   */
  async deleteQuery(userId, queryId) {
    const query = await Query.findOne({
      where: { id: queryId, userId },
    });
    if (!query) {
      const error = new Error("Query not found");
      error.statusCode = 404;
      throw error;
    }
    await query.destroy();
    return { message: "Query deleted" };
  }

  /**
   * Toggle saved status
   */
  async toggleSaved(userId, queryId) {
    const query = await Query.findOne({
      where: { id: queryId, userId },
    });
    if (!query) {
      const error = new Error("Query not found");
      error.statusCode = 404;
      throw error;
    }
    query.isSaved = !query.isSaved;
    await query.save();
    return query;
  }
}

module.exports = new QueriesService();
