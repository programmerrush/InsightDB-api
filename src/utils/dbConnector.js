const { Client: PgClient } = require("pg");

/**
 * Database connector utility
 * Creates and manages connections to user databases (PostgreSQL, MySQL)
 */
class DbConnector {
  /**
   * Create a PostgreSQL connection
   */
  static async connectPostgres({
    host,
    port,
    database,
    username,
    password,
    ssl = false,
  }) {
    const client = new PgClient({
      host,
      port: parseInt(port),
      database,
      user: username,
      password,
      ssl: ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    await client.connect();
    return client;
  }

  /**
   * Create a MySQL connection
   */
  static async connectMysql({ host, port, database, username, password }) {
    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      database,
      user: username,
      password,
      connectTimeout: 10000,
    });
    return connection;
  }

  /**
   * Test a database connection
   */
  static async testConnection(dbType, credentials) {
    let conn;
    try {
      if (dbType === "postgresql" || dbType === "postgres") {
        conn = await DbConnector.connectPostgres(credentials);
        const result = await conn.query("SELECT version()");
        await conn.end();
        return { success: true, version: result.rows[0].version };
      } else if (dbType === "mysql") {
        conn = await DbConnector.connectMysql(credentials);
        const [rows] = await conn.execute("SELECT version() as version");
        await conn.end();
        return { success: true, version: rows[0].version };
      } else {
        throw new Error(`Unsupported database type: ${dbType}`);
      }
    } catch (error) {
      if (conn) {
        try {
          await conn.end();
        } catch (e) {
          /* ignore */
        }
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a query on a user database
   */
  static async executeQuery(dbType, credentials, sql, params = []) {
    let conn;
    try {
      if (dbType === "postgresql" || dbType === "postgres") {
        conn = await DbConnector.connectPostgres(credentials);
        const startTime = Date.now();
        const result = await conn.query(sql, params);
        const duration = Date.now() - startTime;
        await conn.end();

        return {
          rows: result.rows || [],
          rowCount: result.rowCount,
          fields: result.fields
            ? result.fields.map((f) => ({
                name: f.name,
                dataType: f.dataTypeID,
              }))
            : [],
          duration,
        };
      } else if (dbType === "mysql") {
        conn = await DbConnector.connectMysql(credentials);
        const startTime = Date.now();
        const [rows, fields] = await conn.execute(sql, params);
        const duration = Date.now() - startTime;
        await conn.end();

        return {
          rows: Array.isArray(rows) ? rows : [],
          rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows,
          fields: fields
            ? fields.map((f) => ({
                name: f.name,
                dataType: f.type,
              }))
            : [],
          duration,
        };
      } else {
        throw new Error(`Unsupported database type: ${dbType}`);
      }
    } catch (error) {
      if (conn) {
        try {
          await conn.end();
        } catch (e) {
          /* ignore */
        }
      }
      throw error;
    }
  }

  /**
   * Get tables list from a database
   */
  static async getTables(dbType, credentials, schema = "public") {
    if (dbType === "postgresql" || dbType === "postgres") {
      const sql = `
        SELECT 
          t.table_name,
          t.table_type,
          t.table_schema,
          pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))) as size,
          (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as estimated_rows
        FROM information_schema.tables t
        WHERE t.table_schema = $1
        ORDER BY t.table_name;
      `;
      return await DbConnector.executeQuery(dbType, credentials, sql, [schema]);
    } else if (dbType === "mysql") {
      const sql = `
        SELECT 
          TABLE_NAME as table_name,
          TABLE_TYPE as table_type,
          TABLE_SCHEMA as table_schema,
          CONCAT(ROUND(DATA_LENGTH / 1024 / 1024, 2), ' MB') as size,
          TABLE_ROWS as estimated_rows
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME;
      `;
      return await DbConnector.executeQuery(dbType, credentials, sql, [
        credentials.database,
      ]);
    }
  }

  /**
   * Get columns/schema for a specific table
   */
  static async getTableColumns(
    dbType,
    credentials,
    tableName,
    schema = "public",
  ) {
    if (dbType === "postgresql" || dbType === "postgres") {
      const sql = `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          c.ordinal_position,
          CASE 
            WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PK'
            WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'FK'
            WHEN tc.constraint_type = 'UNIQUE' THEN 'UQ'
            ELSE NULL
          END as constraint_type
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage kcu 
          ON c.column_name = kcu.column_name 
          AND c.table_name = kcu.table_name
          AND c.table_schema = kcu.table_schema
        LEFT JOIN information_schema.table_constraints tc 
          ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
        WHERE c.table_name = $1 AND c.table_schema = $2
        ORDER BY c.ordinal_position;
      `;
      return await DbConnector.executeQuery(dbType, credentials, sql, [
        tableName,
        schema,
      ]);
    } else if (dbType === "mysql") {
      const sql = `
        SELECT 
          COLUMN_NAME as column_name,
          DATA_TYPE as data_type,
          IS_NULLABLE as is_nullable,
          COLUMN_DEFAULT as column_default,
          CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
          ORDINAL_POSITION as ordinal_position,
          COLUMN_KEY as constraint_type
        FROM information_schema.COLUMNS
        WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
        ORDER BY ORDINAL_POSITION;
      `;
      return await DbConnector.executeQuery(dbType, credentials, sql, [
        tableName,
        credentials.database,
      ]);
    }
  }

  /**
   * Get data quality metrics for a table
   */
  static async getTableStats(
    dbType,
    credentials,
    tableName,
    schema = "public",
  ) {
    if (dbType === "postgresql" || dbType === "postgres") {
      // Get row count and null percentages
      const countResult = await DbConnector.executeQuery(
        dbType,
        credentials,
        `SELECT count(*) as total_rows FROM ${schema}."${tableName}"`,
      );

      const columnsResult = await DbConnector.getTableColumns(
        dbType,
        credentials,
        tableName,
        schema,
      );
      const totalRows = parseInt(countResult.rows[0]?.total_rows || 0);

      const columnStats = [];
      for (const col of columnsResult.rows) {
        try {
          const statsQuery = `
            SELECT 
              COUNT(*) - COUNT("${col.column_name}") as null_count,
              COUNT(DISTINCT "${col.column_name}") as distinct_count
            FROM ${schema}."${tableName}"
          `;
          const statsResult = await DbConnector.executeQuery(
            dbType,
            credentials,
            statsQuery,
          );
          columnStats.push({
            column_name: col.column_name,
            data_type: col.data_type,
            constraint_type: col.constraint_type,
            null_count: parseInt(statsResult.rows[0]?.null_count || 0),
            null_percentage:
              totalRows > 0
                ? (
                    (parseInt(statsResult.rows[0]?.null_count || 0) /
                      totalRows) *
                    100
                  ).toFixed(1)
                : "0",
            distinct_count: parseInt(statsResult.rows[0]?.distinct_count || 0),
            uniqueness:
              totalRows > 0
                ? (
                    (parseInt(statsResult.rows[0]?.distinct_count || 0) /
                      totalRows) *
                    100
                  ).toFixed(1)
                : "0",
          });
        } catch (e) {
          columnStats.push({
            column_name: col.column_name,
            data_type: col.data_type,
            constraint_type: col.constraint_type,
            null_count: 0,
            null_percentage: "0",
            distinct_count: 0,
            uniqueness: "0",
          });
        }
      }

      const completeness =
        columnStats.length > 0
          ? (
              columnStats.reduce(
                (sum, c) => sum + (100 - parseFloat(c.null_percentage)),
                0,
              ) / columnStats.length
            ).toFixed(1)
          : "100";

      const totalNulls = columnStats.reduce((sum, c) => sum + c.null_count, 0);

      return {
        totalRows,
        columnCount: columnsResult.rows.length,
        completeness: `${completeness}%`,
        totalNulls,
        columns: columnStats,
      };
    }

    // MySQL fallback
    return {
      totalRows: 0,
      columnCount: 0,
      completeness: "0%",
      totalNulls: 0,
      columns: [],
    };
  }

  /**
   * Get views from a database
   */
  static async getViews(dbType, credentials, schema = "public") {
    if (dbType === "postgresql" || dbType === "postgres") {
      const sql = `
        SELECT table_name as view_name, view_definition
        FROM information_schema.views
        WHERE table_schema = $1
        ORDER BY table_name;
      `;
      return await DbConnector.executeQuery(dbType, credentials, sql, [schema]);
    } else if (dbType === "mysql") {
      const sql = `
        SELECT TABLE_NAME as view_name, VIEW_DEFINITION as view_definition
        FROM information_schema.VIEWS
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME;
      `;
      return await DbConnector.executeQuery(dbType, credentials, sql, [
        credentials.database,
      ]);
    }
  }

  /**
   * Get functions/procedures from a database
   */
  static async getFunctions(dbType, credentials, schema = "public") {
    if (dbType === "postgresql" || dbType === "postgres") {
      const sql = `
        SELECT 
          p.proname as function_name,
          pg_get_functiondef(p.oid) as function_definition,
          l.lanname as language,
          CASE p.prokind
            WHEN 'f' THEN 'function'
            WHEN 'p' THEN 'procedure'
            WHEN 'a' THEN 'aggregate'
            WHEN 'w' THEN 'window'
          END as kind
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        JOIN pg_language l ON p.prolang = l.oid
        WHERE n.nspname = $1
        ORDER BY p.proname;
      `;
      return await DbConnector.executeQuery(dbType, credentials, sql, [schema]);
    } else if (dbType === "mysql") {
      const sql = `
        SELECT 
          ROUTINE_NAME as function_name,
          ROUTINE_TYPE as kind,
          ROUTINE_DEFINITION as function_definition
        FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = ?
        ORDER BY ROUTINE_NAME;
      `;
      return await DbConnector.executeQuery(dbType, credentials, sql, [
        credentials.database,
      ]);
    }
  }
}

module.exports = DbConnector;
