const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// 获取用户列表 (仅管理员)
router.get("/", [authMiddleware.verifyToken, roleMiddleware.isAdmin], userController.findAll);

// 获取当前用户信息
router.get("/me", [authMiddleware.verifyToken], userController.getMe);

// 获取用户详情
router.get("/:id", [authMiddleware.verifyToken], userController.findOne);

// 创建用户 (仅管理员)
router.post("/", [authMiddleware.verifyToken, roleMiddleware.isAdmin], userController.create);

// 更新用户
router.put("/:id", [authMiddleware.verifyToken], userController.update);

// 删除用户 (仅管理员)
router.delete("/:id", [authMiddleware.verifyToken, roleMiddleware.isAdmin], userController.delete);

module.exports = router;
