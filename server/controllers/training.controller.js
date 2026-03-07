const db = require("../models");
const Training = db.training;
const TrainingType = db.trainingType;
const Enrollment = db.enrollment;
const User = db.user;
const Notification = db.notification;
const Response = require("../utils/response");

/**
 * 创建培训
 */
exports.create = async (req, res) => {
  try {
    const training = await Training.create({
      ...req.body,
      created_by: req.userId
    });
    return Response.success(res, training, "培训创建成功", 201);
  } catch (error) {
    return Response.error(res, "无法创建培训!", 500, error.message);
  }
};

/**
 * 获取所有培训 (分页)
 */
exports.findAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword, type_id, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (keyword) {
      where.title = { [db.Sequelize.Op.like]: `%${keyword}%` };
    }
    if (type_id) where.type_id = type_id;
    if (status) where.status = status;

    // 权限过滤：如果是讲师，只能看到自己发布的培训计划
    const user = await User.findByPk(req.userId, { include: [db.role] });
    if (user.role.name === 'trainer') {
      where.created_by = req.userId;
    }

    const { count, rows } = await Training.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: TrainingType },
        { model: User, as: 'creator', attributes: ['username', 'employee_id'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // 获取当前用户的所有报名记录，用于在列表中标记
    const myEnrollments = await Enrollment.findAll({
      where: { user_id: req.userId },
      attributes: ['training_id', 'status']
    });
    const enrollmentMap = {};
    myEnrollments.forEach(e => {
      enrollmentMap[e.training_id] = e.status;
    });

    const list = rows.map(row => {
      const item = row.toJSON();
      item.isEnrolled = !!enrollmentMap[item.id];
      item.enrollmentStatus = enrollmentMap[item.id];
      return item;
    });

    return Response.success(res, {
      total: count,
      list,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    return Response.error(res, "获取培训列表失败!", 500, error.message);
  }
};

/**
 * 获取详情
 */
exports.findOne = async (req, res) => {
  try {
    const training = await Training.findByPk(req.params.id, {
      include: [
        { model: TrainingType },
        { model: User, as: 'creator', attributes: ['username', 'employee_id'] }
      ]
    });
    if (!training) return Response.error(res, "未找到该培训", 404);

    // 检查当前用户是否已报名
    const enrollment = await Enrollment.findOne({
      where: { training_id: req.params.id, user_id: req.userId }
    });

    const data = training.toJSON();
    data.isEnrolled = !!enrollment;
    if (enrollment) {
      data.enrollmentStatus = enrollment.status;
      data.enrollmentId = enrollment.id;
    }

    return Response.success(res, data);
  } catch (error) {
    return Response.error(res, "获取详情失败!", 500, error.message);
  }
};

/**
 * 更新培训
 */
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const training = await Training.findByPk(id);
    
    if (!training) return Response.error(res, "未找到该培训", 404);

    // 权限检查：只有创建者或管理员能更新
    if (training.created_by !== req.userId) {
      const currentUser = await User.findByPk(req.userId, { include: [db.role] });
      if (currentUser.role.name !== 'admin' && currentUser.id !== training.created_by) {
        return Response.error(res, "无权修改他人创建的培训", 403);
      }
    }

    // 注意：update 方法如果不指定字段，可能会把 req.body 中所有字段都更新进去
    // 如果前端传了不该更新的字段（比如 created_by），可能会导致权限问题
    // 尤其是如果前端 update 时没有传 created_by，而数据库默认值处理不当，或者 req.body 中包含恶意数据
    
    // 安全起见，我们解构出允许更新的字段
    const { 
      title, type_id, cover, description, content, 
      speaker, speaker_intro, location, start_time, end_time,
      total_hours, credit_hours, max_students, status, materials 
    } = req.body;

    await training.update({
      title, type_id, cover, description, content, 
      speaker, speaker_intro, location, start_time, end_time,
      total_hours, credit_hours, max_students, status, materials 
    });
    
    return Response.success(res, training, "更新成功");
  } catch (error) {
    return Response.error(res, "更新失败!", 500, error.message);
  }
};

/**
 * 删除培训
 */
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const training = await Training.findByPk(id);
    
    if (!training) return Response.error(res, "未找到该培训", 404);

    // 权限检查：只有创建者或管理员能删除
    if (training.created_by !== req.userId) {
      const currentUser = await User.findByPk(req.userId, { include: [db.role] });
      if (currentUser.role.name !== 'admin') {
        return Response.error(res, "无权删除他人创建的培训", 403);
      }
    }

    await Training.destroy({ where: { id } });
    return Response.success(res, {}, "培训删除成功");
  } catch (error) {
    return Response.error(res, "删除失败!", 500, error.message);
  }
};

/**
 * 报名培训
 */
exports.enroll = async (req, res) => {
  try {
    const training_id = req.params.id;
    const user_id = req.userId;

    // 检查权限：管理员无需报名
    const currentUser = await User.findByPk(user_id, { include: [db.role] });
    if (currentUser.role.name === 'admin') {
      return Response.error(res, "管理员无需报名培训项目", 400);
    }

    const training = await Training.findByPk(training_id);
    if (!training) return Response.error(res, "培训不存在", 404);

    if (training.status !== 'published') {
      return Response.error(res, "该培训当前不可报名");
    }

    if (training.current_students >= training.max_students) {
      return Response.error(res, "报名人数已满");
    }

    // 检查是否已报名
    const existing = await Enrollment.findOne({ where: { training_id, user_id } });
    if (existing) return Response.error(res, "您已报名该培训");

    // 创建报名记录
    const enrollment = await Enrollment.create({
      training_id,
      user_id,
      status: 'pending'
    });

    // 更新当前报名人数
    await training.increment('current_students');

    // 向管理员发送报名申请通知
    // 这里假设角色ID为1的是管理员，或者通过角色名查询
    const adminRole = await db.role.findOne({ where: { name: 'admin' } });
    if (adminRole) {
      const admins = await User.findAll({ where: { role_id: adminRole.id } });
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title: '新报名申请',
        content: `用户 ${currentUser.username} 申请报名培训《${training.title}》，请及时审核。`,
        type: 'training',
        link: `/training/audit?id=${training.id}&status=pending`
      }));
      await Notification.bulkCreate(notifications);
    }

    return Response.success(res, enrollment, "报名申请已提交", 201);
  } catch (error) {
    return Response.error(res, "报名失败!", 500, error.message);
  }
};

/**
 * 取消报名
 */
exports.cancelEnroll = async (req, res) => {
  try {
    const training_id = req.params.id;
    const user_id = req.userId;

    const enrollment = await Enrollment.findOne({ where: { training_id, user_id } });
    if (!enrollment) return Response.error(res, "未找到报名记录", 404);

    if (enrollment.status === 'completed') {
      return Response.error(res, "已完成的培训不可取消报名");
    }

    await enrollment.destroy();

    // 更新当前报名人数
    const training = await Training.findByPk(training_id);
    if (training) {
      await training.decrement('current_students');
    }

    return Response.success(res, {}, "报名已取消");
  } catch (error) {
    return Response.error(res, "取消报名失败!", 500, error.message);
  }
};
