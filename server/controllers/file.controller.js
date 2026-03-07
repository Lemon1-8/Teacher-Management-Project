const Response = require("../utils/response");
const { uploadFile } = require("../utils/minio");
const fs = require("fs");
const path = require("path");

/**
 * 单文件上传到 MinIO
 */
exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return Response.error(res, "未检测到上传文件", 400);
    }

    const file = req.file;
    // 修复中文文件名乱码问题
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    // 生成 MinIO 中的对象名称: 文件夹/时间戳-原文件名
    const folder = req.body.type || 'others';
    const objectName = `${folder}/${Date.now()}-${originalname}`;
    
    // 上传到 MinIO
    const url = await uploadFile(objectName, file.path);

    // 删除本地临时文件
    fs.unlinkSync(file.path);

    return Response.success(res, {
      url,
      name: originalname,
      size: file.size,
      mimetype: file.mimetype
    }, "上传成功");
  } catch (error) {
    // 发生错误时尝试清理本地文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return Response.error(res, "文件上传失败!", 500, error.message);
  }
};
