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
   * Auto-discover insights across all tables:
   * - Data quality (null %, completeness)
   * - Column type distribution
   * - Table growth patterns (if date columns exist)
   */
  async getAutoInsights(userId, connectionId) {
    const creds = await connectionService.getCredentials(userId, connectionId);
    const tablesResult = await DbConnector.getTables(creds.dbType, creds);
    const tables = tablesResult.rows.slice(0, 15);

    const isPg = creds.dbType === "postgresql" || creds.dbType === "postgres";

    // 1. Column type distribution across entire database
    const typeDistribution = {};
    const tableInsights = [];
    let totalColumns = 0;
    let totalNullable = 0;

    for (const table of tables.slice(0, 10)) {
      try {
        const cols = await DbConnector.getTableColumns(
          creds.dbType,
          creds,
          table.table_name,
        );
        const columns = cols.rows;
        totalColumns += columns.length;

        let nullableCount = 0;
        let pkCount = 0;
        let fkCount = 0;
        const dateColumns = [];

        for (const col of columns) {
          // Type distribution
          const baseType = col.data_type?.toLowerCase() || "unknown";
          typeDistribution[baseType] = (typeDistribution[baseType] || 0) + 1;

          if (col.is_nullable === "YES") {
            nullableCount++;
            totalNullable++;
          }
          if (col.constraint_type === "PRIMARY KEY") pkCount++;
          if (col.constraint_type === "FOREIGN KEY") fkCount++;
          if (
            [
              "timestamp",
              "timestamptz",
              "date",
              "datetime",
              "timestamp without time zone",
              "timestamp with time zone",
            ].includes(baseType)
          ) {
            dateColumns.push(col.column_name);
          }
        }

        const rows = parseInt(table.estimated_rows) || 0;

        // Basic completeness check (sample based)
        let completeness = 100;
        if (rows > 0 && columns.length > 0) {
          try {
            const qualifiedTable = isPg
              ? `"public"."${table.table_name}"`
              : `\`${table.table_name}\``;

            // Count nulls across all columns (sample first 1000 rows)
            const nullChecks = columns
              .slice(0, 10)
              .map((c) =>
                isPg
                  ? `SUM(CASE WHEN "${c.column_name}" IS NULL THEN 1 ELSE 0 END)`
                  : `SUM(CASE WHEN \`${c.column_name}\` IS NULL THEN 1 ELSE 0 END)`,
              );
            const limitClause = isPg
              ? `(SELECT * FROM ${qualifiedTable} LIMIT 1000)`
              : `(SELECT * FROM ${qualifiedTable} LIMIT 1000)`;
            const nullResult = await DbConnector.executeQuery(
              creds.dbType,
              creds,
              `SELECT ${nullChecks.join(", ")} FROM ${limitClause} AS sample_data`,
            );
            const nullValues = Object.values(nullResult.rows[0] || {}).map(
              Number,
            );
            const sampleRows = Math.min(rows, 1000);
            const totalCells = sampleRows * columns.slice(0, 10).length;
            const totalNulls = nullValues.reduce((a, b) => a + b, 0);
            completeness =
              totalCells > 0
                ? Math.round(((totalCells - totalNulls) / totalCells) * 100)
                : 100;
          } catch (e) {
            /* ignore — keep 100% */
          }
        }

        // Try to get growth trend if date column exists
        let growthTrend = null;
        if (dateColumns.length > 0 && rows > 0) {
          try {
            const dateCol = dateColumns[0];
            const qualifiedTable = isPg
              ? `"public"."${table.table_name}"`
              : `\`${table.table_name}\``;
            const truncFn = isPg ? "date_trunc('month'," : "DATE_FORMAT(";
            const truncEnd = isPg ? ")" : ", '%Y-%m')";
            const periodExpr = isPg
              ? `date_trunc('month', "${dateCol}")`
              : `DATE_FORMAT(\`${dateCol}\`, '%Y-%m')`;

            const trendResult = await DbConnector.executeQuery(
              creds.dbType,
              creds,
              `SELECT ${periodExpr} as period, COUNT(*) as count
               FROM ${qualifiedTable}
               WHERE ${isPg ? `"${dateCol}"` : `\`${dateCol}\``} IS NOT NULL
               GROUP BY period
               ORDER BY period DESC
               LIMIT 6`,
            );
            growthTrend = trendResult.rows.reverse();
          } catch (e) {
            /* ignore */
          }
        }

        tableInsights.push({
          name: table.table_name,
          rows,
          size: table.size,
          columnCount: columns.length,
          nullableCount,
          pkCount,
          fkCount,
          completeness,
          dateColumns,
          growthTrend,
        });
      } catch (e) {
        /* skip table */
      }
    }

    // 2. Top column types (sorted by count)
    const sortedTypes = Object.entries(typeDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([type, count]) => ({ type, count }));

    // 3. Overall data quality score
    const overallCompleteness =
      tableInsights.length > 0
        ? Math.round(
            tableInsights.reduce((s, t) => s + t.completeness, 0) /
              tableInsights.length,
          )
        : 0;

    return {
      tableInsights,
      columnTypeDistribution: sortedTypes,
      totalColumns,
      totalNullable,
      overallCompleteness,
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
