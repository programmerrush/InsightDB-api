const router = require("express").Router();
const settingsController = require("./settings.controller");
const auth = require("../../middleware/auth");

router.use(auth);

router.get("/", settingsController.getAllSettings);
router.put("/", settingsController.updateSetting);
router.put("/bulk", settingsController.updateBulkSettings);
router.post("/reset", settingsController.resetSettings);

module.exports = router;
