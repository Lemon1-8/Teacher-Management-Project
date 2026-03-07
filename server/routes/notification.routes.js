const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const authMiddleware = require("../middleware/auth.middleware");

// 获取我的通知
router.get("/my", [authMiddleware.verifyToken], notificationController.findMyNotifications);

// 标记已读 (id 可以是数字或 'all')
router.put("/:id/read", [authMiddleware.verifyToken], notificationController.markAsRead);

// 发送通知 (仅管理员/系统调用)
router.post("/", [authMiddleware.verifyToken], notificationController.create);

module.exports = router;
