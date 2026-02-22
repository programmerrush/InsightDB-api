const router = require("express").Router();
const securityController = require("./security.controller");
const auth = require("../../middleware/auth");

router.use(auth);

// API Key Management
router.post("/api-keys", securityController.createApiKey);
router.get("/api-keys", securityController.listApiKeys);
router.delete("/api-keys/:id", securityController.revokeApiKey);

// Two-Factor Authentication
router.get("/2fa/status", securityController.get2FAStatus);
router.post("/2fa/enable", securityController.enable2FA);
router.post("/2fa/disable", securityController.disable2FA);

// Audit Logs
router.get("/audit-logs", securityController.getAuditLogs);

// Active Sessions
router.get("/sessions", securityController.getActiveSessions);

// Data Erasure
router.post("/data-erasure", securityController.requestDataErasure);

module.exports = router;
