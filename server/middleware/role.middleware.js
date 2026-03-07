const db = require("../models");
const User = db.user;
const Role = db.role;
const Response = require("../utils/response");

/**
 * 检查是否为管理员
 */
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    const role = await Role.findByPk(user.role_id);

    if (role.name === "admin") {
      next();
      return;
    }

    return Response.error(res, "需要管理员权限!", 403);
  } catch (error) {
    return Response.error(res, "服务器内部错误!", 500, error.message);
  }
};

/**
 * 检查是否为讲师或管理员
 */
const isTrainerOrAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    const role = await Role.findByPk(user.role_id);

    if (role.name === "trainer" || role.name === "admin") {
      next();
      return;
    }

    return Response.error(res, "需要讲师或管理员权限!", 403);
  } catch (error) {
    return Response.error(res, "服务器内部错误!", 500, error.message);
  }
};

const roleMiddleware = {
  isAdmin,
  isTrainerOrAdmin
};

module.exports = roleMiddleware;
