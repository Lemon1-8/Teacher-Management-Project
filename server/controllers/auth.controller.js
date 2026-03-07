const db = require("../models");
const config = require("../config/auth.config");
const User = db.user;
const Role = db.role;
const Response = require("../utils/response");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const redisUtil = require("../utils/redis");

/**
 * 登录
 */
exports.login = async (req, res) => {
  try {
    const { employee_id, password, role } = req.body;

    const user = await User.findOne({
      where: { employee_id },
      include: [Role]
    });

    if (!user) {
      return Response.error(res, "用户不存在!", 404);
    }

    // 校验角色
    if (role && user.role.name !== role) {
      return Response.error(res, "角色不匹配，请选择正确的登录角色!", 403);
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password);

    if (!passwordIsValid) {
      return Response.error(res, "密码错误!", 401);
    }

    const token = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: config.jwtExpiration
    });

    // 将 Token 存入 Redis，实现持久化和单点登录
    await redisUtil.setToken(user.id, token, config.jwtExpiration);

    const authorities = user.role ? user.role.name : "teacher";

    return Response.success(res, {
      id: user.id,
      employee_id: user.employee_id,
      username: user.username,
      email: user.email,
      role: authorities,
      accessToken: token
    }, "登录成功");

  } catch (error) {
    return Response.error(res, "登录失败!", 500, error.message);
  }
};

/**
 * 登出
 */
exports.logout = async (req, res) => {
  try {
    // 移除 Redis 中的 Token
    if (req.userId) {
      await redisUtil.removeToken(req.userId);
    }
    return Response.success(res, {}, "登出成功");
  } catch (error) {
    return Response.error(res, "登出失败!", 500, error.message);
  }
};

/**
 * 刷新 Token
 */
exports.refresh = (req, res) => {
  // 简易刷新逻辑，实际应配合 refresh_token 表或 Redis
  return Response.success(res, {}, "Token 已刷新");
};
