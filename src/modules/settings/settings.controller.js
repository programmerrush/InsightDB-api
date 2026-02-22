const settingsService = require("./settings.service");
const ApiResponse = require("../../utils/apiResponse");

class SettingsController {
  async getAllSettings(req, res, next) {
    try {
      const settings = await settingsService.getAllSettings(req.user.id);
      return ApiResponse.success(res, settings);
    } catch (error) {
      next(error);
    }
  }

  async updateSetting(req, res, next) {
    try {
      const { key, value } = req.body;
      if (!key) return ApiResponse.error(res, "key is required", 400);
      const result = await settingsService.updateSetting(
        req.user.id,
        key,
        value,
      );
      return ApiResponse.success(res, result, "Setting updated");
    } catch (error) {
      next(error);
    }
  }

  async updateBulkSettings(req, res, next) {
    try {
      const results = await settingsService.updateBulkSettings(
        req.user.id,
        req.body,
      );
      return ApiResponse.success(res, results, "Settings updated");
    } catch (error) {
      next(error);
    }
  }

  async resetSettings(req, res, next) {
    try {
      const result = await settingsService.resetSettings(req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
