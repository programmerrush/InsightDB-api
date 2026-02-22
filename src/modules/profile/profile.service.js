const User = require("../../models/User");
const AuditLog = require("../../models/AuditLog");

class ProfileService {
  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    return user.toSafeJSON();
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, data) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // Only allow updating certain fields
    const allowedFields = ["fullName", "avatar"];
    const updates = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates[field] = data[field];
      }
    }

    await user.update(updates);

    await AuditLog.create({
      userId,
      action: "UPDATE_PROFILE",
      resource: "profile",
      details: { updatedFields: Object.keys(updates) },
    });

    return user.toSafeJSON();
  }

  /**
   * Update email (with re-validation)
   */
  async updateEmail(userId, { email }) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const existing = await User.findOne({ where: { email } });
    if (existing && existing.id !== userId) {
      const error = new Error("Email already in use");
      error.statusCode = 409;
      throw error;
    }

    user.email = email;
    await user.save();

    await AuditLog.create({
      userId,
      action: "UPDATE_EMAIL",
      resource: "profile",
    });

    return user.toSafeJSON();
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    user.isActive = false;
    await user.save();

    await AuditLog.create({
      userId,
      action: "DEACTIVATE_ACCOUNT",
      resource: "profile",
    });

    return { message: "Account deactivated" };
  }
}

module.exports = new ProfileService();
