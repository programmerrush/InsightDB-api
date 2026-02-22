const Setting = require("../../models/Setting");

class SettingsService {
  /**
   * Get all settings for a user
   */
  async getAllSettings(userId) {
    const settings = await Setting.findAll({ where: { userId } });

    // Convert to key-value map
    const result = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    // Return defaults for missing settings
    const defaults = {
      notifications: { email: true, push: true, queryAlerts: true },
      appearance: { theme: "light", accentColor: "brand", fontSize: "medium" },
      integrations: {},
      billing: { plan: "free" },
      systemMode: "light",
    };

    return { ...defaults, ...result };
  }

  /**
   * Update a specific setting
   */
  async updateSetting(userId, key, value) {
    const [setting, created] = await Setting.findOrCreate({
      where: { userId, key },
      defaults: { userId, key, value },
    });

    if (!created) {
      setting.value = value;
      await setting.save();
    }

    return { key, value: setting.value };
  }

  /**
   * Update multiple settings at once
   */
  async updateBulkSettings(userId, settings) {
    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      const result = await this.updateSetting(userId, key, value);
      results.push(result);
    }
    return results;
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings(userId) {
    await Setting.destroy({ where: { userId } });
    return { message: "Settings reset to defaults" };
  }
}

module.exports = new SettingsService();
