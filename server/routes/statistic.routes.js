const express = require("express");
const router = express.Router();
const statisticController = require("../controllers/statistic.controller");
const authMiddleware = require("../middleware/auth.middleware");

// 获取仪表盘统计数据
router.get("/dashboard", [authMiddleware.verifyToken], statisticController.getDashboardData);

// 获取个人学时统计
router.get("/my-hours", [authMiddleware.verifyToken], statisticController.getMyHours);

module.exports = router;
