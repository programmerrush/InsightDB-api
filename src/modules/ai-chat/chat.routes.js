const router = require("express").Router();
const chatController = require("./chat.controller");
const auth = require("../../middleware/auth");

router.use(auth);

router.post("/message", chatController.sendMessage);
router.get("/sessions", chatController.getSessions);
router.get("/sessions/:sessionId", chatController.getSessionHistory);
router.delete("/sessions/:sessionId", chatController.deleteSession);

module.exports = router;
