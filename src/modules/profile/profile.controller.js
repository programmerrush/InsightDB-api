const profileService = require("./profile.service");
const ApiResponse = require("../../utils/apiResponse");

class ProfileController {
  async getProfile(req, res, next) {
    try {
      const profile = await profileService.getProfile(req.user.id);
      return ApiResponse.success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const profile = await profileService.updateProfile(req.user.id, req.body);
      return ApiResponse.success(res, profile, "Profile updated");
    } catch (error) {
      next(error);
    }
  }

  async updateEmail(req, res, next) {
    try {
      const profile = await profileService.updateEmail(req.user.id, req.body);
      return ApiResponse.success(res, profile, "Email updated");
    } catch (error) {
      next(error);
    }
  }

  async deactivateAccount(req, res, next) {
    try {
      const result = await profileService.deactivateAccount(req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProfileController();
