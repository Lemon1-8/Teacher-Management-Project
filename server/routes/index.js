const messageRoutes = require("./message.routes");

module.exports = (app) => {
  // 认证路由
  app.use("/api/auth", require("./auth.routes"));
  
  // 用户管理路由
  app.use("/api/users", require("./user.routes"));
  
  // 培训管理路由
  app.use("/api/trainings", require("./training.routes"));
  
  // 考试管理路由
  app.use("/api/exams", require("./exam.routes"));
  
  // 统计报表路由
  app.use("/api/statistics", require("./statistic.routes"));
  
  // 培训类型管理
  app.use("/api/training-types", require("./training_type.routes"));
  
  // 报名管理
  app.use("/api/enrollments", require("./enrollment.routes"));

  // 文件上传管理
  app.use("/api/files", require("./file.routes"));

  // 通知管理
  app.use("/api/notifications", require("./notification.routes"));

  // 消息管理
  app.use("/api/messages", messageRoutes);
};
