const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const upload = require("../middleware/upload.middleware");
const authMiddleware = require("../middleware/auth.middleware");

// 单文件上传 (需要登录)
router.post("/upload", [authMiddleware.verifyToken, upload.single("file")], fileController.upload);

module.exports = router;
