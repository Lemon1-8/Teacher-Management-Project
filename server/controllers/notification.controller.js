const db = require("../models");
const Notification = db.notification;
const Response = require("../utils/response");

/**
 * 获取我的通知列表
 */
exports.findMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, is_read } = req.query;
    const offset = (page - 1) * limit;

    const where = { user_id: req.userId };
    if (is_read !== undefined) {
      where.is_read = is_read === 'true';
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return Response.success(res, {
      total: count,
      list: rows,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    return Response.error(res, "获取通知失败!", 500, error.message);
  }
};

/**
 * 标记通知为已读
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 如果 id 为 'all'，则全部已读
    if (id === 'all') {
      await Notification.update({ is_read: true }, {
        where: { user_id: req.userId, is_read: false }
      });
      return Response.success(res, {}, "全部已读");
    }

    const notification = await Notification.findByPk(id);
    if (!notification) return Response.error(res, "通知不存在", 404);
    if (notification.user_id !== req.userId) return Response.error(res, "无权操作", 403);

    await notification.update({ is_read: true });
    return Response.success(res, {}, "标记已读");
  } catch (error) {
    return Response.error(res, "操作失败!", 500, error.message);
  }
};

/**
 * 创建系统通知 (仅管理员或系统内部调用)
 */
exports.create = async (req, res) => {
  try {
    const { user_id, title, content, type, link } = req.body;
    await Notification.create({
      user_id,
      title,
      content,
      type,
      link
    });
    return Response.success(res, {}, "发送成功");
  } catch (error) {
    return Response.error(res, "发送失败!", 500, error.message);
  }
};
