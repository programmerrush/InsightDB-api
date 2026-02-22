const connectionService = require("../connection/connection.service");
const DbConnector = require("../../utils/dbConnector");

class InsightsService {
  /**
   * Generate overview insights for a connection
   * Provides summary statistics from the connected database
   */
  async getOverview(userId, connectionId) {
    const creds = await connectionService.getCredentials(userId, connectionId);

    // Get all tables
    const tablesResult = await DbConnector.getTables(creds.dbType, creds);
    const tables = tablesResult.rows;

    const totalTables = tables.length;
    const totalRows = tables.reduce(
      (sum, t) => sum + (parseInt(t.estimated_rows) || 0),
      0,
    );

    // Get database size
    let dbSize = "N/A";
    if (creds.dbType === "postgresql" || creds.dbType === "postgres") {
      try {
        const sizeResult = await DbConnector.executeQuery(
          creds.dbType,
          creds,
          `SELECT pg_size_pretty(pg_database_size(current_database())) as size`,
        );
        dbSize = sizeResult.rows[0]?.size || "N/A";
      } catch (e) {
        /* ignore */
      }
    }

    return {
      totalTables,
      totalRows,
      databaseSize: dbSize,
      tables: tables.map((t) => ({
        name: t.table_name,
        rows: parseInt(t.estimated_rows) || 0,
        size: t.size,
        type: t.table_type,
      })),
    };
  }

  /**
   * Get data distribution insights for a specific table
   */
  async getTableInsights(userId, connectionId, tableName, schema = "public") {
    const creds = await connectionService.getCredentials(userId, connectionId);

    // Get basic stats
    const stats = await DbConnector.getTableStats(
      creds.dbType,
      creds,
      tableName,
      schema,
    );

    // Find columns with numeric types for additional analysis
    const numericColumns = stats.columns.filter((c) =>
      [
        "integer",
        "bigint",
        "numeric",
        "decimal",
        "real",
        "double precision",
        "smallint",
        "int",
        "float",
      ].includes(c.data_type.toLowerCase()),
    );

    const numericInsights = [];
    for (const col of numericColumns.slice(0, 5)) {
      try {
        const qualifiedTable =
          creds.dbType === "postgresql"
            ? `"${schema}"."${tableName}"`
            : `\`${tableName}\``;

        const result = await DbConnector.executeQuery(
          creds.dbType,
          creds,
          `SELECT 
            MIN("${col.column_name}") as min_val,
            MAX("${col.column_name}") as max_val,
            AVG("${col.column_name}")::numeric(15,2) as avg_val,
            COUNT("${col.column_name}") as count
          FROM ${qualifiedTable}`,
        );

        if (result.rows[0]) {
          numericInsights.push({
            column: col.column_name,
            min: result.rows[0].min_val,
            max: result.rows[0].max_val,
            avg: result.rows[0].avg_val,
            count: result.rows[0].count,
          });
        }
      } catch (e) {
        /* skip columns that fail */
      }
    }

    return {
      tableName,
      ...stats,
      numericInsights,
    };
  }

  /**
   * Get trend data — tries to find temporal data and aggregate
   */
  async getTrends(
    userId,
    connectionId,
    tableName,
    { dateColumn, valueColumn, groupBy = "month", schema = "public" },
  ) {
    const creds = await connectionService.getCredentials(userId, connectionId);

    if (creds.dbType === "postgresql" || creds.dbType === "postgres") {
      const qualifiedTable = `"${schema}"."${tableName}"`;
      const sql = `
        SELECT 
          date_trunc('${groupBy}', "${dateColumn}") as period,
          COUNT(*) as count
          ${valueColumn ? `, SUM("${valueColumn}") as total` : ""}
        FROM ${qualifiedTable}
        WHERE "${dateColumn}" IS NOT NULL
        GROUP BY period
        ORDER BY period DESC
        LIMIT 24;
      `;

      const result = await DbConnector.executeQuery(creds.dbType, creds, sql);
      return {
        tableName,
        dateColumn,
        valueColumn,
        groupBy,
        data: result.rows,
      };
    }

    return { tableName, data: [] };
  }
}

module.exports = new InsightsService();
