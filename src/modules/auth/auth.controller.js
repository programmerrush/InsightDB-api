const authService = require("./auth.service");
const ApiResponse = require("../../utils/apiResponse");

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return ApiResponse.created(res, result, "Registration successful");
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const meta = {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      };
      const result = await authService.login(req.body, meta);
      return ApiResponse.success(res, result, "Login successful");
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      return ApiResponse.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const result = await authService.changePassword(req.user.id, req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
