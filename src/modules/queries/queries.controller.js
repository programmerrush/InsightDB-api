const queriesService = require("./queries.service");
const ApiResponse = require("../../utils/apiResponse");

class QueriesController {
  async executeQuery(req, res, next) {
    try {
      const result = await queriesService.executeQuery(req.user.id, req.body);
      return ApiResponse.success(res, result, "Query executed successfully");
    } catch (error) {
      next(error);
    }
  }

  async saveQuery(req, res, next) {
    try {
      const query = await queriesService.saveQuery(req.user.id, req.body);
      return ApiResponse.created(res, query, "Query saved");
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const { page, limit, connectionId } = req.query;
      const result = await queriesService.getHistory(req.user.id, {
        page,
        limit,
        connectionId,
      });
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getSavedQueries(req, res, next) {
    try {
      const queries = await queriesService.getSavedQueries(
        req.user.id,
        req.query.connectionId,
      );
      return ApiResponse.success(res, queries);
    } catch (error) {
      next(error);
    }
  }

  async getQueryById(req, res, next) {
    try {
      const query = await queriesService.getQueryById(
        req.user.id,
        req.params.id,
      );
      return ApiResponse.success(res, query);
    } catch (error) {
      next(error);
    }
  }

  async deleteQuery(req, res, next) {
    try {
      const result = await queriesService.deleteQuery(
        req.user.id,
        req.params.id,
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async toggleSaved(req, res, next) {
    try {
      const query = await queriesService.toggleSaved(
        req.user.id,
        req.params.id,
      );
      return ApiResponse.success(res, query, "Query save status toggled");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QueriesController();
