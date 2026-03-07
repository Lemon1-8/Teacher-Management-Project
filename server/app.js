const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const path = require("path");
const config = require("./config/app.config");
const logger = require("./utils/logger");
const db = require("./models");

const app = express();

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: false, // 允许图片等资源跨域
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "http:", "https:", "*"], // 允许从 MinIO 等任意地址加载图片
      connectSrc: ["'self'", "http:", "https:", "*"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "http:", "https:", "*"],
      frameSrc: ["'self'"],
    },
  },
})); 
app.use(cors()); // 允许跨域
app.use(hpp()); // 防止 HTTP 参数污染

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 1000, // 每个 IP 限制 1000 个请求 (开发/演示环境放宽限制)
  message: { code: 429, message: "请求过于频繁，请稍后再试" }
});
app.use("/api/", limiter);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件目录
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 数据库同步
const initialData = require("./seeders/init.seeder");
const { initBucket } = require("./utils/minio");
const { initRedis } = require("./utils/redis");

// 暂时关闭 alter: true 以避免 "Too many keys specified" 错误
// 待清理冗余索引后再开启
db.sequelize.sync({ alter: false }).then(async () => {
  logger.info("数据库同步成功 (已跳过架构更新)");
  await initialData();
  await initBucket();
  await initRedis(); // 提前初始化 Redis 连接，避免请求时才连接导致延迟或错误
}).catch(err => {
  logger.error("数据库同步失败: " + err.message);
});

// 基础路由
app.get("/", (req, res) => {
  res.json({ message: "欢迎使用高校教师培训管理系统 API" });
});

// 导入所有路由
require("./routes/index")(app);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: "未找到请求的资源" });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || "服务器内部错误",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

const PORT = config.PORT;
app.listen(PORT, () => {
  logger.info(`服务器运行在端口: ${PORT}`);
});

// 捕获未处理的异常，防止进程退出
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
