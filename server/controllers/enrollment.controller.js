const db = require("../models");
const Enrollment = db.enrollment;
const Training = db.training;
const User = db.user;
const Notification = db.notification;
const Response = require("../utils/response");

/**
 * 获取当前用户的报名列表
 */
exports.findMyEnrollments = async (req, res) => {
  try {
    const { status } = req.query;
    const where = { user_id: req.userId };
    if (status) where.status = status;

    const enrollments = await Enrollment.findAll({
      where,
      include: [{
        model: Training,
        attributes: ['id', 'title', 'start_time', 'end_time', 'location', 'total_hours']
      }],
      order: [['enroll_time', 'DESC']]
    });

    return Response.success(res, enrollments);
  } catch (error) {
    return Response.error(res, "获取报名列表失败!", 500, error.message);
  }
};

/**
 * 获取所有报名列表 (管理员/讲师使用)
 */
exports.findAll = async (req, res) => {
  try {
    const { status, training_id } = req.query;
    const where = {};
    
    // 只有当 status 有值且不是 'all' 或空字符串时才添加到查询条件
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (training_id) where.training_id = training_id;

    // 权限过滤：如果是讲师，只能看到自己创建的培训的报名
    const user = await User.findByPk(req.userId, { include: [db.role] });
    let includeTrainingWhere = {};
    
    if (user.role.name === 'trainer') {
      includeTrainingWhere = { created_by: req.userId };
    }

    const enrollments = await Enrollment.findAll({
      where,
      include: [
        {
          model: Training,
          attributes: ['id', 'title', 'created_by'],
          where: includeTrainingWhere // 应用过滤
        },
        {
          model: User,
          attributes: ['id', 'username', 'employee_id', 'department']
        }
      ],
      order: [['enroll_time', 'DESC']]
    });

    return Response.success(res, enrollments);
  } catch (error) {
    return Response.error(res, "获取列表失败!", 500, error.message);
  }
};

/**
 * 审核报名
 */
exports.audit = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return Response.error(res, "无效的状态", 400);
    }

    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [{ model: Training, attributes: ['id', 'title', 'created_by'] }]
    });
    
    if (!enrollment) return Response.error(res, "未找到报名记录", 404);

    // 权限校验：管理员或该培训的创建者(讲师)
    const user = await User.findByPk(req.userId, { include: [db.role] });
    const isAdmin = user.role.name === 'admin';
    const isOwner = enrollment.training.created_by === req.userId;

    if (!isAdmin && !isOwner) {
      return Response.error(res, "无权审核此报名申请", 403);
    }

    if (enrollment.status !== 'pending') {
      return Response.error(res, "该报名已处理", 400);
    }

    await enrollment.update({ status });

    // 如果拒绝，则减少培训人数
    if (status === 'rejected') {
      const training = await Training.findByPk(enrollment.training_id);
      if (training) {
        await training.decrement('current_students');
      }
    }

    // 发送系统通知
    const trainingInfo = await Training.findByPk(enrollment.training_id);
    await Notification.create({
      user_id: enrollment.user_id,
      title: `报名审核${status === 'approved' ? '通过' : '未通过'}`,
      content: `您申请的培训项目《${trainingInfo.title}》审核${status === 'approved' ? '已通过，请及时参加培训' : '未通过，请联系管理员'}。`,
      type: 'training',
      link: `/training/detail/${enrollment.training_id}`
    });

    return Response.success(res, {}, "审核成功");
  } catch (error) {
    return Response.error(res, "审核失败!", 500, error.message);
  }
};

/**
 * 考勤签到
 */
exports.attendance = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [Training]
    });
    
    if (!enrollment) return Response.error(res, "未找到报名记录", 404);
    if (enrollment.user_id !== req.userId) return Response.error(res, "无权进行此操作", 403);
    
    if (enrollment.status !== 'approved') {
      return Response.error(res, "报名未通过审核，无法签到", 400);
    }

    if (enrollment.attendance_status === 'present') {
      return Response.error(res, "您已经签到过了", 400);
    }

    // 更新签到状态
    await enrollment.update({
      attendance_status: 'present',
      status: 'completed' // 签到后视为完成培训（实际可能需要更多逻辑）
    });

    // 记录学时
    await db.learningRecord.create({
      user_id: req.userId,
      training_id: enrollment.training_id,
      hours: enrollment.training.total_hours,
      type: 'training',
      acquire_time: new Date()
    });

    // 发送学时到账通知
    await Notification.create({
      user_id: req.userId,
      title: '学时已到账',
      content: `恭喜您完成培训《${enrollment.training.title}》，已获得 ${enrollment.training.total_hours} 学时。`,
      type: 'system',
      link: '/user/hours'
    });

    return Response.success(res, {}, "签到成功，已记录学时");
  } catch (error) {
    return Response.error(res, "签到失败!", 500, error.message);
  }
};

/**
 * 获取/生成证书
 */
exports.getCertificate = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id, {
      include: [Training, User]
    });

    if (!enrollment) return Response.error(res, "未找到记录", 404);
    if (enrollment.status !== 'completed') {
      return Response.error(res, "培训未完成，无法生成证书", 400);
    }

    // 模拟生成证书 URL (实际可以使用 canvas 或 pdf 库生成图片并存入 MinIO)
    const certUrl = `https://cert-generator.example.com/view?id=${enrollment.id}&user=${encodeURIComponent(enrollment.user.username)}&training=${encodeURIComponent(enrollment.training.title)}`;
    
    if (!enrollment.certificate_url) {
      await enrollment.update({ certificate_url: certUrl });
    }

    return Response.success(res, { url: certUrl });
  } catch (error) {
    return Response.error(res, "证书生成失败!", 500, error.message);
  }
};

/**
 * 提交培训评估
 */
exports.evaluate = async (req, res) => {
  try {
    const { score, comment } = req.body;
    const enrollment = await Enrollment.findByPk(req.params.id);
    
    if (!enrollment) return Response.error(res, "未找到报名记录", 404);
    if (enrollment.user_id !== req.userId) return Response.error(res, "无权评估他人报名", 403);
    
    await enrollment.update({
      evaluation_score: score,
      evaluation_comment: comment,
      evaluation_time: new Date()
    });
    
    return Response.success(res, {}, "评估成功");
  } catch (error) {
    return Response.error(res, "提交评估失败!", 500, error.message);
  }
};
