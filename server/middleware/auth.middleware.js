const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Response = require("../utils/response");
const redisUtil = require("../utils/redis");

/**
 * 验证 Token 中间件
 */
const verifyToken = async (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];

  if (!token) {
    return Response.error(res, "未提供 Token!", 403);
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  try {
    const decoded = jwt.verify(token, config.secret);
    req.userId = decoded.id;

    // 从 Redis 中校验 Token 是否存在且匹配
    // 这可以实现单点登录（新登录挤掉旧登录）或手动下线功能
    const storedToken = await redisUtil.getToken(req.userId);
    if (!storedToken || storedToken !== token) {
      return Response.error(res, "登录已失效或已在其他地方登录!", 401);
    }

    next();
  } catch (err) {
    return Response.error(res, "无效的 Token!", 401);
  }
};

const authMiddleware = {
  verifyToken
};

module.exports = authMiddleware;
