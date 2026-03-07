const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

// 登录
router.post("/login", authController.login);

// 登出
router.post("/logout", authController.logout);

// 刷新 Token
router.post("/refresh", authController.refresh);

// 修改密码
// router.put("/change-password", [authMiddleware.verifyToken], authController.changePassword);

// 忘记密码
// router.post("/forgot-password", authController.forgotPassword);

module.exports = router;
