const ApiKey = require("../../models/ApiKey");
const AuditLog = require("../../models/AuditLog");
const User = require("../../models/User");

class SecurityService {
  // ==================== API KEY MANAGEMENT ====================

  /**
   * Create a new API key
   */
  async createApiKey(
    userId,
    { name, permissions = ["read"], expiresAt = null },
  ) {
    const { key, prefix } = ApiKey.generateKey();

    const apiKey = await ApiKey.create({
      userId,
      name,
      key,
      prefix,
      permissions,
      expiresAt,
    });

    await AuditLog.create({
      userId,
      action: "CREATE_API_KEY",
      resource: "api_key",
      resourceId: apiKey.id,
      details: { name },
    });

    // Return the full key only on creation (never again)
    return {
      id: apiKey.id,
      name: apiKey.name,
      key, // Only returned once
      prefix: apiKey.prefix,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * List all API keys for a user
   */
  async listApiKeys(userId) {
    const keys = await ApiKey.findAll({
      where: { userId },
      attributes: [
        "id",
        "name",
        "prefix",
        "permissions",
        "isActive",
        "lastUsedAt",
        "expiresAt",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
    });
    return keys;
  }

  /**
   * Revoke (delete) an API key
   */
  async revokeApiKey(userId, keyId) {
    const apiKey = await ApiKey.findOne({ where: { id: keyId, userId } });
    if (!apiKey) {
      const error = new Error("API key not found");
      error.statusCode = 404;
      throw error;
    }

    await apiKey.update({ isActive: false });

    await AuditLog.create({
      userId,
      action: "REVOKE_API_KEY",
      resource: "api_key",
      resourceId: keyId,
    });

    return { message: "API key revoked" };
  }

  // ==================== 2FA MANAGEMENT ====================

  /**
   * Enable 2FA (simplified — generates a mock secret)
   */
  async enable2FA(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // In production, use speakeasy or similar TOTP library
    const secret = require("crypto").randomBytes(20).toString("hex");
    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    await user.save();

    await AuditLog.create({
      userId,
      action: "ENABLE_2FA",
      resource: "security",
    });

    return {
      enabled: true,
      message: "Two-factor authentication enabled",
      // In production, return a QR code URL
      secret: secret.substring(0, 16),
    };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    await AuditLog.create({
      userId,
      action: "DISABLE_2FA",
      resource: "security",
    });

    return { enabled: false, message: "Two-factor authentication disabled" };
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    return { enabled: user.twoFactorEnabled };
  }

  // ==================== AUDIT LOGS ====================

  /**
   * Get audit logs for a user
   */
  async getAuditLogs(userId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return {
      logs: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    };
  }

  // ==================== ACTIVE SESSIONS ====================

  /**
   * Get active sessions (simplified — returns audit log login events)
   */
  async getActiveSessions(userId) {
    const logins = await AuditLog.findAll({
      where: { userId, action: "LOGIN" },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    return logins.map((log) => ({
      id: log.id,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      loginAt: log.createdAt,
    }));
  }

  // ==================== DATA ERASURE ====================

  /**
   * Request data erasure
   */
  async requestDataErasure(userId) {
    await AuditLog.create({
      userId,
      action: "DATA_ERASURE_REQUEST",
      resource: "security",
    });

    return {
      message:
        "Data erasure request submitted. Our team will process this within 30 days.",
      requestedAt: new Date().toISOString(),
    };
  }
}

module.exports = new SecurityService();
