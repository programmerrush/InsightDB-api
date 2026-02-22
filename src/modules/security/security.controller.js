const securityService = require("./security.service");
const ApiResponse = require("../../utils/apiResponse");

class SecurityController {
  // API Keys
  async createApiKey(req, res, next) {
    try {
      const result = await securityService.createApiKey(req.user.id, req.body);
      return ApiResponse.created(res, result, "API key created");
    } catch (error) {
      next(error);
    }
  }

  async listApiKeys(req, res, next) {
    try {
      const keys = await securityService.listApiKeys(req.user.id);
      return ApiResponse.success(res, keys);
    } catch (error) {
      next(error);
    }
  }

  async revokeApiKey(req, res, next) {
    try {
      const result = await securityService.revokeApiKey(
        req.user.id,
        req.params.id,
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // 2FA
  async enable2FA(req, res, next) {
    try {
      const result = await securityService.enable2FA(req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async disable2FA(req, res, next) {
    try {
      const result = await securityService.disable2FA(req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async get2FAStatus(req, res, next) {
    try {
      const result = await securityService.get2FAStatus(req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Audit Logs
  async getAuditLogs(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await securityService.getAuditLogs(req.user.id, {
        page,
        limit,
      });
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Sessions
  async getActiveSessions(req, res, next) {
    try {
      const sessions = await securityService.getActiveSessions(req.user.id);
      return ApiResponse.success(res, sessions);
    } catch (error) {
      next(error);
    }
  }

  // Data Erasure
  async requestDataErasure(req, res, next) {
    try {
      const result = await securityService.requestDataErasure(req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SecurityController();
