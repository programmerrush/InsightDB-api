const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const AuditLog = require("../../models/AuditLog");
const config = require("../../config");

class AuthService {
  /**
   * Register a new user
   */
  async register({ fullName, email, password }) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const error = new Error("Email already registered");
      error.statusCode = 409;
      throw error;
    }

    const user = await User.create({
      fullName,
      email,
      password,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
    });

    const token = this.generateToken(user);

    return {
      user: user.toSafeJSON(),
      token,
    };
  }

  /**
   * Login a user
   */
  async login({ email, password }, meta = {}) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error("Account is deactivated");
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken(user);

    // Log the login event
    await AuditLog.create({
      userId: user.id,
      action: "LOGIN",
      resource: "auth",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      user: user.toSafeJSON(),
      token,
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const error = new Error("Current password is incorrect");
      error.statusCode = 400;
      throw error;
    }

    user.password = newPassword;
    await user.save();

    return { message: "Password changed successfully" };
  }

  /**
   * Get current user
   */
  async getMe(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    return user.toSafeJSON();
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn },
    );
  }
}

module.exports = new AuthService();
