const db = require("../models");
const User = db.user;
const Role = db.role;
const Response = require("../utils/response");
const bcrypt = require("bcryptjs");

/**
 * 创建新用户
 */
exports.create = async (req, res) => {
  try {
    const { employee_id, username, password, department, role_id } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 8);

    const user = await User.create({
      employee_id,
      username,
      password: hashedPassword,
      department,
      role_id: role_id || 2, // 默认讲师
      status: 1
    });

    return Response.success(res, user, "用户创建成功", 201);
  } catch (error) {
    return Response.error(res, "无法创建用户!", 500, error.message);
  }
};

/**
 * 获取所有用户 (分页)
 */
exports.findAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword, department } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (keyword) {
      where[db.Sequelize.Op.or] = [
        { username: { [db.Sequelize.Op.like]: `%${keyword}%` } },
        { employee_id: { [db.Sequelize.Op.like]: `%${keyword}%` } }
      ];
    }
    if (department) {
      where.department = department;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [Role],
      attributes: { exclude: ['password'] }
    });

    return Response.success(res, {
      total: count,
      list: rows,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    return Response.error(res, "获取用户列表失败!", 500, error.message);
  }
};

/**
 * 获取详情
 */
exports.findOne = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [Role],
      attributes: { exclude: ['password'] }
    });
    if (!user) return Response.error(res, "未找到该用户", 404);
    return Response.success(res, user);
  } catch (error) {
    return Response.error(res, "获取详情失败!", 500, error.message);
  }
};

/**
 * 获取当前用户信息
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: [Role],
      attributes: { exclude: ['password'] }
    });
    return Response.success(res, user);
  } catch (error) {
    return Response.error(res, "获取个人信息失败!", 500, error.message);
  }
};

/**
 * 更新用户
 */
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    // 权限检查：只有管理员或用户本人能更新
    if (req.userId !== parseInt(id)) {
      const currentUser = await User.findByPk(req.userId, { include: [Role] });
      if (currentUser.role.name !== 'admin') {
        return Response.error(res, "无权修改其他用户信息", 403);
      }
    }

    if (req.body.password) {
      req.body.password = bcrypt.hashSync(req.body.password, 8);
    }

    const [num] = await User.update(req.body, { where: { id } });
    if (num === 1) {
      return Response.success(res, {}, "更新成功");
    } else {
      return Response.error(res, "更新失败，未找到用户或数据未变更");
    }
  } catch (error) {
    return Response.error(res, "更新失败!", 500, error.message);
  }
};

/**
 * 删除用户
 */
exports.delete = async (req, res) => {
  try {
    const num = await User.destroy({ where: { id: req.params.id } });
    if (num === 1) {
      return Response.success(res, {}, "用户删除成功");
    } else {
      return Response.error(res, "删除失败，未找到用户");
    }
  } catch (error) {
    return Response.error(res, "删除失败!", 500, error.message);
  }
};
