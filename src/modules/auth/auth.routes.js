const router = require("express").Router();
const authController = require("./auth.controller");
const validate = require("../../middleware/validate");
const auth = require("../../middleware/auth");
const { register, login, changePassword } = require("./auth.validation");

// Public routes
router.post("/register", validate(register), authController.register);
router.post("/login", validate(login), authController.login);

// Protected routes
router.get("/me", auth, authController.getMe);
router.put(
  "/change-password",
  auth,
  validate(changePassword),
  authController.changePassword,
);

module.exports = router;
