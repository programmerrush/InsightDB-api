const chatService = require("./chat.service");
const ApiResponse = require("../../utils/apiResponse");

class ChatController {
  async sendMessage(req, res, next) {
    try {
      const { connectionId, message, sessionId } = req.body;
      const result = await chatService.sendMessage(req.user.id, {
        connectionId,
        message,
        sessionId,
      });
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getSessionHistory(req, res, next) {
    try {
      const messages = await chatService.getSessionHistory(
        req.user.id,
        req.params.sessionId,
      );
      return ApiResponse.success(res, messages);
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req, res, next) {
    try {
      const sessions = await chatService.getSessions(req.user.id);
      return ApiResponse.success(res, sessions);
    } catch (error) {
      next(error);
    }
  }

  async deleteSession(req, res, next) {
    try {
      const result = await chatService.deleteSession(
        req.user.id,
        req.params.sessionId,
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
