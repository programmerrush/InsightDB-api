const explorerService = require("./explorer.service");
const ApiResponse = require("../../utils/apiResponse");

class ExplorerController {
  async getSchemas(req, res, next) {
    try {
      const schemas = await explorerService.getSchemas(
        req.user.id,
        req.params.connectionId,
      );
      return ApiResponse.success(res, schemas);
    } catch (error) {
      next(error);
    }
  }

  async getTables(req, res, next) {
    try {
      const schema = req.query.schema || "public";
      const tables = await explorerService.getTables(
        req.user.id,
        req.params.connectionId,
        schema,
      );
      return ApiResponse.success(res, tables);
    } catch (error) {
      next(error);
    }
  }

  async getViews(req, res, next) {
    try {
      const schema = req.query.schema || "public";
      const views = await explorerService.getViews(
        req.user.id,
        req.params.connectionId,
        schema,
      );
      return ApiResponse.success(res, views);
    } catch (error) {
      next(error);
    }
  }

  async getFunctions(req, res, next) {
    try {
      const schema = req.query.schema || "public";
      const functions = await explorerService.getFunctions(
        req.user.id,
        req.params.connectionId,
        schema,
      );
      return ApiResponse.success(res, functions);
    } catch (error) {
      next(error);
    }
  }

  async getTableColumns(req, res, next) {
    try {
      const schema = req.query.schema || "public";
      const columns = await explorerService.getTableColumns(
        req.user.id,
        req.params.connectionId,
        req.params.tableName,
        schema,
      );
      return ApiResponse.success(res, columns);
    } catch (error) {
      next(error);
    }
  }

  async getTableStats(req, res, next) {
    try {
      const schema = req.query.schema || "public";
      const stats = await explorerService.getTableStats(
        req.user.id,
        req.params.connectionId,
        req.params.tableName,
        schema,
      );
      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async previewTableData(req, res, next) {
    try {
      const { limit = 50, offset = 0, schema = "public" } = req.query;
      const data = await explorerService.previewTableData(
        req.user.id,
        req.params.connectionId,
        req.params.tableName,
        { limit, offset, schema },
      );
      return ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExplorerController();
