const express = require("express");
const router = express.Router();
const trainingController = require("../controllers/training.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// 获取培训列表
router.get("/", [authMiddleware.verifyToken], trainingController.findAll);

// 获取培训详情
router.get("/:id", [authMiddleware.verifyToken], trainingController.findOne);

// 创建培训 (仅管理员/讲师)
router.post("/", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], trainingController.create);

// 更新培训 (仅创建者/管理员)
router.put("/:id", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], trainingController.update);

// 删除培训 (管理员/讲师)
router.delete("/:id", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], trainingController.delete);

// 报名培训
router.post("/:id/enroll", [authMiddleware.verifyToken], trainingController.enroll);

// 取消报名
router.delete("/:id/cancel", [authMiddleware.verifyToken], trainingController.cancelEnroll);

module.exports = router;
