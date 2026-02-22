const insightsService = require("./insights.service");
const ApiResponse = require("../../utils/apiResponse");

class InsightsController {
  async getOverview(req, res, next) {
    try {
      const data = await insightsService.getOverview(
        req.user.id,
        req.params.connectionId,
      );
      return ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getTableInsights(req, res, next) {
    try {
      const schema = req.query.schema || "public";
      const data = await insightsService.getTableInsights(
        req.user.id,
        req.params.connectionId,
        req.params.tableName,
        schema,
      );
      return ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getTrends(req, res, next) {
    try {
      const { dateColumn, valueColumn, groupBy, schema } = req.query;
      if (!dateColumn) {
        return ApiResponse.error(
          res,
          "dateColumn query parameter is required",
          400,
        );
      }
      const data = await insightsService.getTrends(
        req.user.id,
        req.params.connectionId,
        req.params.tableName,
        { dateColumn, valueColumn, groupBy, schema },
      );
      return ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InsightsController();
