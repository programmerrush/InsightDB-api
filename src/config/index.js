module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-key-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  encryption: {
    key:
      process.env.ENCRYPTION_KEY ||
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || null,
  },
};
