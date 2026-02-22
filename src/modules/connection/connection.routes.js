const router = require("express").Router();
const connectionController = require("./connection.controller");
const validate = require("../../middleware/validate");
const auth = require("../../middleware/auth");
const {
  createConnection,
  testConnection,
  updateConnection,
} = require("./connection.validation");

// All routes require authentication
router.use(auth);

router.post(
  "/test",
  validate(testConnection),
  connectionController.testConnection,
);
router.post(
  "/",
  validate(createConnection),
  connectionController.createConnection,
);
router.get("/", connectionController.listConnections);
router.get("/:id", connectionController.getConnection);
router.put(
  "/:id",
  validate(updateConnection),
  connectionController.updateConnection,
);
router.delete("/:id", connectionController.deleteConnection);

module.exports = router;
