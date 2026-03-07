const express = require("express");
const router = express.Router();
const enrollmentController = require("../controllers/enrollment.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// 获取当前用户的报名列表
router.get("/my", [authMiddleware.verifyToken], enrollmentController.findMyEnrollments);

// 获取所有报名列表 (管理员/讲师)
router.get("/", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], enrollmentController.findAll);

// 审核报名 (管理员/讲师)
router.post("/:id/audit", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], enrollmentController.audit);

// 考勤签到
router.post("/:id/attendance", [authMiddleware.verifyToken], enrollmentController.attendance);

// 获取/生成证书
router.get("/:id/certificate", [authMiddleware.verifyToken], enrollmentController.getCertificate);

// 提交培训评估
router.post("/:id/evaluate", [authMiddleware.verifyToken], enrollmentController.evaluate);

module.exports = router;
