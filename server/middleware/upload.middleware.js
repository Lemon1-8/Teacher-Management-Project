const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 限制提升到 500MB (视频通常较大)
  fileFilter: (req, file, cb) => {
    // 允许的扩展名
    const allowedExtensions = [
      // 图片
      '.jpg', '.jpeg', '.png', '.gif',
      // 文档
      '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt',
      // 压缩包
      '.zip', '.rar', '.7z',
      // 视频
      '.mp4', '.webm', '.avi', '.mov', '.mkv'
    ];
    const extname = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(extname)) {
      return cb(null, true);
    }
    logger.warn(`文件上传被拒绝: "${file.originalname}" (扩展名 "${extname}" 不在允许列表中)`);
    cb(new Error(`不支持的文件类型: ${extname || '无扩展名'}`));
  }
});

module.exports = upload;
