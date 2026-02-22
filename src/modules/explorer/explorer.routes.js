const router = require("express").Router();
const explorerController = require("./explorer.controller");
const auth = require("../../middleware/auth");

router.use(auth);

// Schema browser
router.get("/:connectionId/schemas", explorerController.getSchemas);
router.get("/:connectionId/tables", explorerController.getTables);
router.get("/:connectionId/views", explorerController.getViews);
router.get("/:connectionId/functions", explorerController.getFunctions);

// Table detail
router.get(
  "/:connectionId/tables/:tableName/columns",
  explorerController.getTableColumns,
);
router.get(
  "/:connectionId/tables/:tableName/stats",
  explorerController.getTableStats,
);
router.get(
  "/:connectionId/tables/:tableName/data",
  explorerController.previewTableData,
);

module.exports = router;
