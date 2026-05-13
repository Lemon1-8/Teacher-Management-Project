const express = require("express");
const router = express.Router();
const examController = require("../controllers/exam.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

// 获取考试列表
router.get("/", [authMiddleware.verifyToken], examController.findAll);

// 获取考试详情
router.get("/:id", [authMiddleware.verifyToken], examController.findOne);

// 开始考试 (获取试题)
router.post("/:id/start", [authMiddleware.verifyToken], examController.startExam);

// 提交试卷
router.post("/results/:id/submit", [authMiddleware.verifyToken], examController.submitExam);

// 创建考试 (仅管理员/讲师)
router.post("/", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], examController.create);

// 更新考试
router.put("/:id", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], examController.update);

// 获取考试成绩 (仅管理员/讲师)
router.get("/:id/results", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], examController.getResults);

// 删除考试
router.delete("/:id", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], examController.delete);

// --- 题目管理 ---

// 获取指定考试的所有题目 (管理员/讲师可见答案)
router.get("/:id/questions", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], examController.findAllQuestions);

// 为考试添加/更新题目
router.post("/:id/questions", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], examController.saveQuestions);

// 导入题目
router.post("/:id/import", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin, upload.single('file')], examController.importQuestions);

// AI 生成题目（支持上传文件）
router.post("/:id/generate-questions", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin, upload.single('file')], examController.generateQuestions);

// 删除单个题目
router.delete("/questions/:id", [authMiddleware.verifyToken, roleMiddleware.isTrainerOrAdmin], examController.deleteQuestion);

module.exports = router;
