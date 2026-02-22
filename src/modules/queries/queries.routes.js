const router = require("express").Router();
const queriesController = require("./queries.controller");
const validate = require("../../middleware/validate");
const auth = require("../../middleware/auth");
const { executeQuery, saveQuery } = require("./queries.validation");

router.use(auth);

router.post("/execute", validate(executeQuery), queriesController.executeQuery);
router.post("/save", validate(saveQuery), queriesController.saveQuery);
router.get("/history", queriesController.getHistory);
router.get("/saved", queriesController.getSavedQueries);
router.get("/:id", queriesController.getQueryById);
router.delete("/:id", queriesController.deleteQuery);
router.patch("/:id/toggle-save", queriesController.toggleSaved);

module.exports = router;
