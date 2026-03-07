const express = require("express");
const router = express.Router();
const messageController = require("../controllers/message.controller");
const authMiddleware = require("../middleware/auth.middleware");

// 发送消息
router.post("/", [authMiddleware.verifyToken], messageController.send);

// 获取联系人列表
router.get("/contacts", [authMiddleware.verifyToken], messageController.getContacts);

// 获取与某人的聊天记录
router.get("/:userId", [authMiddleware.verifyToken], messageController.getMessages);

module.exports = router;