const router = require("express").Router();
const insightsController = require("./insights.controller");
const auth = require("../../middleware/auth");

router.use(auth);

router.get("/:connectionId/overview", insightsController.getOverview);
router.get("/:connectionId/auto", insightsController.getAutoInsights);
router.get(
  "/:connectionId/tables/:tableName",
  insightsController.getTableInsights,
);
router.get(
  "/:connectionId/tables/:tableName/trends",
  insightsController.getTrends,
);

module.exports = router;
