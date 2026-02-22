const connectionService = require("./connection.service");
const ApiResponse = require("../../utils/apiResponse");

class ConnectionController {
  async testConnection(req, res, next) {
    try {
      const result = await connectionService.testConnection(req.body);
      if (result.success) {
        return ApiResponse.success(res, result, "Connection successful");
      }
      return ApiResponse.error(res, `Connection failed: ${result.error}`, 400);
    } catch (error) {
      next(error);
    }
  }

  async createConnection(req, res, next) {
    try {
      const connection = await connectionService.createConnection(
        req.user.id,
        req.body,
      );
      return ApiResponse.created(
        res,
        connection,
        "Connection created and verified",
      );
    } catch (error) {
      next(error);
    }
  }

  async listConnections(req, res, next) {
    try {
      const connections = await connectionService.listConnections(req.user.id);
      return ApiResponse.success(res, connections);
    } catch (error) {
      next(error);
    }
  }

  async getConnection(req, res, next) {
    try {
      const connection = await connectionService.getConnection(
        req.user.id,
        req.params.id,
      );
      return ApiResponse.success(res, connection);
    } catch (error) {
      next(error);
    }
  }

  async updateConnection(req, res, next) {
    try {
      const connection = await connectionService.updateConnection(
        req.user.id,
        req.params.id,
        req.body,
      );
      return ApiResponse.success(res, connection, "Connection updated");
    } catch (error) {
      next(error);
    }
  }

  async deleteConnection(req, res, next) {
    try {
      const result = await connectionService.deleteConnection(
        req.user.id,
        req.params.id,
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConnectionController();
