const db = require("../models");
const Training = db.training;
const Enrollment = db.enrollment;
const LearningRecord = db.learningRecord;
const Exam = db.exam;
const ExamResult = db.examResult;
const User = db.user;
const Response = require("../utils/response");

/**
 * 获取仪表盘数据
 */
exports.getDashboardData = async (req, res) => {
  try {
    const user_id = req.userId;
    const user = await User.findByPk(user_id, { include: [db.role] });
    const isAdmin = user.role.name === 'admin';
    
    if (isAdmin) {
      // --- 管理员视角 ---
      // 1. 关键指标
      const totalTeachers = await User.count({ include: [{ model: db.role, where: { name: 'teacher' } }] });
      const activeTrainings = await Training.count({ where: { status: 'published' } });
      const pendingAudits = await Enrollment.count({ where: { status: 'pending' } });
      const todayEnrollments = await Enrollment.count({ 
        where: { 
          enroll_time: { [db.Sequelize.Op.gte]: new Date(new Date().setHours(0,0,0,0)) } 
        } 
      });

      return Response.success(res, {
        role: 'admin',
        stats: [
          { title: '教师总数', value: totalTeachers, tag: '总览', type: 'primary', link: '/system/user' },
          { title: '进行中培训', value: activeTrainings, tag: '活跃', type: 'success', link: '/training/list' },
          { title: '待审核报名', value: pendingAudits, tag: '待办', type: 'warning', link: '/training/audit?status=pending' },
          { title: '今日新增报名', value: todayEnrollments, tag: '实时', type: 'info', link: '/training/audit' }
        ],
        charts: {
          // 这里可以后续扩展图表数据，暂时返回空或简单数据
          trend: [], 
          typeDistribution: []
        }
      });

    } else if (user.role.name === 'trainer') {
      // --- 讲师视角 ---
      // 1. 我负责的培训 (作为讲师) - 目前系统设计中 training 表没有 trainer_id 字段，通常讲师创建的培训即为其负责
      // 假设 created_by 字段即为负责人
      const myTrainings = await Training.count({ where: { created_by: user_id } });
      const activeMyTrainings = await Training.count({ where: { created_by: user_id, status: 'published' } });
      
      // 待审核 (如果讲师也能审核)
      // 假设讲师可以审核自己创建的培训的报名
      const myTrainingIds = await Training.findAll({ where: { created_by: user_id }, attributes: ['id'] }).then(ts => ts.map(t => t.id));
      const pendingAudits = await Enrollment.count({ where: { training_id: myTrainingIds, status: 'pending' } });
      
      // 累计学员 (报名我课程并通过的人数)
      const totalStudents = await Enrollment.count({ where: { training_id: myTrainingIds, status: ['approved', 'completed'] } });

      // --- 讲师图表数据 ---
      // 1. 培训参与趋势 (近6个月每月报名人数)
      const months = [];
      const trendData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push(monthStr);

        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        const count = await Enrollment.count({
          where: {
            training_id: myTrainingIds.length > 0 ? { [db.Sequelize.Op.in]: myTrainingIds } : { [db.Sequelize.Op.in]: [0] }, // 防止空数组报错
            enroll_time: {
              [db.Sequelize.Op.between]: [startDate, endDate]
            }
          }
        });
        trendData.push(count);
      }

      // 2. 培训类型分布
      // 需要联表查询 Training -> TrainingType
      const typeDistribution = await Training.findAll({
        where: { created_by: user_id },
        include: [{ model: db.trainingType, attributes: ['name'] }],
        attributes: ['type_id', [db.sequelize.fn('COUNT', db.sequelize.col('training.id')), 'count']],
        group: ['type_id', 'training_type.name'] // 必须包含所有非聚合列
      }).then(list => list.map(item => ({
        name: item.training_type ? item.training_type.name : '未分类',
        value: parseInt(item.get('count'))
      })));

      return Response.success(res, {
        role: 'trainer',
        stats: [
          { title: '我的课程', value: myTrainings, tag: '累计', type: 'primary', link: '/training/list' },
          { title: '进行中', value: activeMyTrainings, tag: '授课', type: 'success', link: '/training/list' },
          { title: '待审核', value: pendingAudits, tag: '待办', type: 'warning', link: '/training/audit?status=pending' },
          { title: '累计学员', value: totalStudents, tag: '人次', type: 'info', link: '/training/audit' }
        ],
        charts: {
          trend: {
            categories: months,
            series: trendData
          },
          typeDistribution
        }
      });

    } else {
      // --- 教师视角 ---
      // 1. 个人关键指标
      const myTrainings = await Enrollment.count({ where: { user_id, status: ['approved', 'completed'] } });
      const totalHours = await LearningRecord.sum('hours', { where: { user_id } }) || 0;
      
      // 待考项目
      // 逻辑修正：只统计我已报名且审核通过(或已完成)的培训所关联的、且我未完成的考试
      
      // 1. 获取我参与的培训 ID
      const myEnrollments = await Enrollment.findAll({
        where: { user_id, status: ['approved', 'completed'] },
        attributes: ['training_id']
      });
      const myTrainingIds = myEnrollments.map(e => e.training_id);

      let pendingExams = 0;
      if (myTrainingIds.length > 0) {
        // 2. 获取我已完成的考试 ID
        const takenExamIds = await ExamResult.findAll({
          where: { user_id, status: 'completed' }, // 这里只排除已完成的，如果未及格可能需要重考，依然算待考？
          // 假设 completed 就算考过了（无论及格与否），或者业务上 failed 需要重考则不排除
          // 这里简单起见，只要提交过且状态为 completed 就算考过
          attributes: ['exam_id']
        }).then(results => results.map(r => r.exam_id));

        // 3. 统计符合条件的考试
        pendingExams = await Exam.count({
          where: {
            status: 'published',
            training_id: { [db.Sequelize.Op.in]: myTrainingIds },
            id: { [db.Sequelize.Op.notIn]: takenExamIds.length > 0 ? takenExamIds : [0] }
          }
        });
      }
      
      // 待签到培训
      const pendingAttendance = await Enrollment.count({ where: { user_id, status: 'approved', attendance_status: 'absent' } });

      return Response.success(res, {
        role: 'teacher',
        stats: [
          { title: '我的培训', value: myTrainings, tag: '累计', type: 'primary', link: '/user/training' },
          { title: '累计学时', value: parseFloat(totalHours).toFixed(1), tag: '年度', type: 'success', link: '/user/hours' },
          { title: '待考项目', value: pendingExams, tag: '紧急', type: 'danger', link: '/exam/list' },
          { title: '待签到', value: pendingAttendance, tag: '行动', type: 'warning', link: '/user/training?status=approved' }
        ]
      });
    }
  } catch (error) {
    return Response.error(res, "获取统计数据失败!", 500, error.message);
  }
};

/**
 * 获取个人学时
 */
exports.getMyHours = async (req, res) => {
  try {
    const records = await LearningRecord.findAll({
      where: { user_id: req.userId },
      include: [Training],
      order: [['acquire_time', 'DESC']]
    });
    return Response.success(res, records);
  } catch (error) {
    return Response.error(res, "获取学时数据失败!", 500, error.message);
  }
};
