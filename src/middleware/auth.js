const jwt = require("jsonwebtoken");
const config = require("../config");
const ApiResponse = require("../utils/apiResponse");

/**
 * JWT Authentication Middleware
 * Extracts and verifies the JWT token from the Authorization header
 */
function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponse.error(res, "Access denied. No token provided.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return ApiResponse.error(res, "Token has expired.", 401);
    }
    if (error.name === "JsonWebTokenError") {
      return ApiResponse.error(res, "Invalid token.", 401);
    }
    return ApiResponse.error(res, "Authentication failed.", 401);
  }
}

module.exports = auth;
