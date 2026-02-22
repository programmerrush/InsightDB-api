const connectionService = require("../connection/connection.service");
const DbConnector = require("../../utils/dbConnector");

class ExplorerService {
  /**
   * Get all tables for a connection
   */
  async getTables(userId, connectionId, schema = "public") {
    const creds = await connectionService.getCredentials(userId, connectionId);
    const result = await DbConnector.getTables(creds.dbType, creds, schema);
    return result.rows.map((row) => ({
      name: row.table_name,
      type: row.table_type,
      schema: row.table_schema,
      size: row.size,
      estimatedRows: row.estimated_rows ? parseInt(row.estimated_rows) : 0,
    }));
  }

  /**
   * Get all views for a connection
   */
  async getViews(userId, connectionId, schema = "public") {
    const creds = await connectionService.getCredentials(userId, connectionId);
    const result = await DbConnector.getViews(creds.dbType, creds, schema);
    return result.rows;
  }

  /**
   * Get all functions for a connection
   */
  async getFunctions(userId, connectionId, schema = "public") {
    const creds = await connectionService.getCredentials(userId, connectionId);
    const result = await DbConnector.getFunctions(creds.dbType, creds, schema);
    return result.rows;
  }

  /**
   * Get column schema for a table
   */
  async getTableColumns(userId, connectionId, tableName, schema = "public") {
    const creds = await connectionService.getCredentials(userId, connectionId);
    const result = await DbConnector.getTableColumns(
      creds.dbType,
      creds,
      tableName,
      schema,
    );
    return result.rows;
  }

  /**
   * Get data quality stats for a table
   */
  async getTableStats(userId, connectionId, tableName, schema = "public") {
    const creds = await connectionService.getCredentials(userId, connectionId);
    return await DbConnector.getTableStats(
      creds.dbType,
      creds,
      tableName,
      schema,
    );
  }

  /**
   * Preview table data (first N rows)
   */
  async previewTableData(
    userId,
    connectionId,
    tableName,
    { limit = 50, offset = 0, schema = "public" },
  ) {
    const creds = await connectionService.getCredentials(userId, connectionId);
    const qualifiedName =
      creds.dbType === "postgresql"
        ? `"${schema}"."${tableName}"`
        : `\`${tableName}\``;

    const sql = `SELECT * FROM ${qualifiedName} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    return await DbConnector.executeQuery(creds.dbType, creds, sql);
  }

  /**
   * Get schemas list
   */
  async getSchemas(userId, connectionId) {
    const creds = await connectionService.getCredentials(userId, connectionId);
    let sql;
    if (creds.dbType === "postgresql" || creds.dbType === "postgres") {
      sql = `SELECT schema_name FROM information_schema.schemata 
             WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
             ORDER BY schema_name`;
    } else {
      sql = `SELECT SCHEMA_NAME as schema_name FROM information_schema.SCHEMATA ORDER BY SCHEMA_NAME`;
    }
    const result = await DbConnector.executeQuery(creds.dbType, creds, sql);
    return result.rows;
  }
}

module.exports = new ExplorerService();
