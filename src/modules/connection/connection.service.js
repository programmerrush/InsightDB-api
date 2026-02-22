const Connection = require("../../models/Connection");
const AuditLog = require("../../models/AuditLog");
const DbConnector = require("../../utils/dbConnector");
const { encrypt, decrypt } = require("../../utils/encryption");

class ConnectionService {
  /**
   * Test database connection without saving
   */
  async testConnection(data) {
    const result = await DbConnector.testConnection(data.dbType, {
      host: data.host,
      port: data.port,
      database: data.database,
      username: data.username,
      password: data.password,
      ssl: data.ssl,
    });
    return result;
  }

  /**
   * Create and save a new database connection
   */
  async createConnection(userId, data) {
    // Test connection first
    const testResult = await this.testConnection(data);
    if (!testResult.success) {
      const error = new Error(`Connection failed: ${testResult.error}`);
      error.statusCode = 400;
      throw error;
    }

    // Encrypt the password before saving
    const encryptedPassword = encrypt(data.password);

    const connection = await Connection.create({
      userId,
      name: data.name,
      dbType: data.dbType,
      host: data.host,
      port: data.port,
      database: data.database,
      username: data.username,
      encryptedPassword,
      ssl: data.ssl || false,
      lastConnectedAt: new Date(),
    });

    // Audit log
    await AuditLog.create({
      userId,
      action: "CREATE",
      resource: "connection",
      resourceId: connection.id,
      details: { name: data.name, dbType: data.dbType, host: data.host },
    });

    return this.sanitizeConnection(connection);
  }

  /**
   * List all connections for a user
   */
  async listConnections(userId) {
    const connections = await Connection.findAll({
      where: { userId },
      order: [["updatedAt", "DESC"]],
    });
    return connections.map((c) => this.sanitizeConnection(c));
  }

  /**
   * Get a single connection by ID
   */
  async getConnection(userId, connectionId) {
    const connection = await Connection.findOne({
      where: { id: connectionId, userId },
    });
    if (!connection) {
      const error = new Error("Connection not found");
      error.statusCode = 404;
      throw error;
    }
    return this.sanitizeConnection(connection);
  }

  /**
   * Update a connection
   */
  async updateConnection(userId, connectionId, data) {
    const connection = await Connection.findOne({
      where: { id: connectionId, userId },
    });
    if (!connection) {
      const error = new Error("Connection not found");
      error.statusCode = 404;
      throw error;
    }

    if (data.password) {
      data.encryptedPassword = encrypt(data.password);
      delete data.password;
    }

    await connection.update(data);

    await AuditLog.create({
      userId,
      action: "UPDATE",
      resource: "connection",
      resourceId: connectionId,
    });

    return this.sanitizeConnection(connection);
  }

  /**
   * Delete a connection
   */
  async deleteConnection(userId, connectionId) {
    const connection = await Connection.findOne({
      where: { id: connectionId, userId },
    });
    if (!connection) {
      const error = new Error("Connection not found");
      error.statusCode = 404;
      throw error;
    }

    await connection.destroy();

    await AuditLog.create({
      userId,
      action: "DELETE",
      resource: "connection",
      resourceId: connectionId,
    });

    return { message: "Connection deleted successfully" };
  }

  /**
   * Get decrypted credentials for internal use
   */
  async getCredentials(userId, connectionId) {
    const connection = await Connection.findOne({
      where: { id: connectionId, userId },
    });
    if (!connection) {
      const error = new Error("Connection not found");
      error.statusCode = 404;
      throw error;
    }

    return {
      dbType: connection.dbType,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: decrypt(connection.encryptedPassword),
      ssl: connection.ssl,
    };
  }

  /**
   * Remove sensitive data from connection object
   */
  sanitizeConnection(connection) {
    const data = connection.toJSON();
    delete data.encryptedPassword;
    return data;
  }
}

module.exports = new ConnectionService();
