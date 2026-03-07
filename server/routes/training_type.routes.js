const express = require("express");
const router = express.Router();
const trainingTypeController = require("../controllers/training_type.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// 获取培训类型列表
router.get("/", [authMiddleware.verifyToken], trainingTypeController.findAll);

// 创建培训类型 (仅管理员)
router.post("/", [authMiddleware.verifyToken, roleMiddleware.isAdmin], trainingTypeController.create);

// 更新培训类型 (仅管理员)
router.put("/:id", [authMiddleware.verifyToken, roleMiddleware.isAdmin], trainingTypeController.update);

// 删除培训类型 (仅管理员)
router.delete("/:id", [authMiddleware.verifyToken, roleMiddleware.isAdmin], trainingTypeController.delete);

module.exports = router;
