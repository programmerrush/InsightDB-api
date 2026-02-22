const router = require("express").Router();
const profileController = require("./profile.controller");
const validate = require("../../middleware/validate");
const auth = require("../../middleware/auth");
const { updateProfile, updateEmail } = require("./profile.validation");

router.use(auth);

router.get("/", profileController.getProfile);
router.put("/", validate(updateProfile), profileController.updateProfile);
router.put("/email", validate(updateEmail), profileController.updateEmail);
router.post("/deactivate", profileController.deactivateAccount);

module.exports = router;
