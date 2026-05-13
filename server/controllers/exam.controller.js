const db = require("../models");
const Exam = db.exam;
const Question = db.question;
const ExamResult = db.examResult;
const Response = require("../utils/response");
const xlsx = require("xlsx");
const fs = require("fs");
const mammoth = require("mammoth");
const pdf = require("pdf-parse");

/**
 * 获取考试列表
 */
exports.findAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, training_id } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (training_id) where.training_id = training_id;

    const user = await db.user.findByPk(req.userId, { include: [db.role] });
    
    // 讲师：只能看到自己创建的考试 (包括草稿)，以及所有已发布的考试(如果他也想考)
    // 教师(学员)：只能看到自己已报名且审核通过的培训项目所关联的考试
    // 管理员：可以看到所有考试
    
    if (user.role.name === 'trainer') {
        // 如果前面已经设置了 training_id (比如从培训详情页点进来的)，则以那个 training_id 为主
        // 这里需要注意 where 对象的合并逻辑
        // where.training_id = ... 可能会覆盖前面的
        
        // 讲师逻辑：created_by = userId OR status = 'published'
        // 但如果有 training_id 过滤，则是在这个范围内找
        const permissionWhere = {
            [db.Sequelize.Op.or]: [
                { created_by: req.userId },
                { status: 'published' }
            ]
        };
        Object.assign(where, permissionWhere);
        
    } else if (user.role.name === 'teacher') {
        // 查找该教师所有已报名且通过审核(或已完成)的培训 ID
        const enrollments = await db.enrollment.findAll({
            where: { 
                user_id: req.userId,
                status: ['approved', 'completed'] // 放宽条件：已完成培训的也要能看到考试
            },
            attributes: ['training_id']
        });
        const enrolledTrainingIds = enrollments.map(e => e.training_id);
        
        // console.log('Teacher enrolled training IDs:', enrolledTrainingIds); // 调试日志

        // 如果前端传了 training_id，我们要检查这个 training_id 是否在 enrolledTrainingIds 中
        if (where.training_id) {
            // 注意：前端传来的 training_id 可能是字符串，需要转换
            const reqTrainingId = parseInt(where.training_id);
            if (!enrolledTrainingIds.includes(reqTrainingId)) {
                // 如果请求的 training_id 不在已报名列表中，直接返回空
                where.training_id = -1; 
            }
            // 如果在，where.training_id 保持不变
        } else {
            // 如果没传 training_id，则查询所有已报名的 training_id
            // 如果 enrolledTrainingIds 为空，说明没报名任何培训，应返回空列表
            if (enrolledTrainingIds.length > 0) {
                 // 使用 Object.assign 确保不覆盖前面的 where 条件 (虽然前面好像没别的了)
                 // 关键修正：确保 [db.Sequelize.Op.in] 被正确识别
                 where.training_id = { [db.Sequelize.Op.in]: enrolledTrainingIds };
            } else {
                 where.training_id = -1; // 强制查空
            }
        }
        
        // 确保状态是 published
        where.status = 'published';
        
    } else if (user.role.name === 'admin') {
        // 管理员看所有，无需额外过滤 (除非前端传了 status 参数)
    }

    const { count, rows } = await Exam.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // 获取当前用户对每个考试的最高状态（pass/fail/none）
    const myResults = await ExamResult.findAll({
      where: { user_id: req.userId },
      attributes: ['exam_id', 'is_pass', 'status', 'score']
    });
    const resultMap = {};
    myResults.forEach(r => {
      // 如果已经及格，则状态锁定为 passed
      if (r.is_pass) {
        resultMap[r.exam_id] = { status: 'passed', score: r.score };
      } else if (!resultMap[r.exam_id] || resultMap[r.exam_id].status !== 'passed') {
        // 如果未及格，记录为 failed (前端显示“再试一次”)
        resultMap[r.exam_id] = { status: 'failed', score: r.score };
      }
    });

    const list = rows.map(row => {
      const item = row.toJSON();
      
      // 动态计算考试状态 (仅依据时间，忽略数据库中的 status 字段)
      // 如果 status 是 draft，则保持 draft
      if (item.status !== 'draft') {
        const now = new Date();
        const start = item.start_time ? new Date(item.start_time) : null;
        const end = item.end_time ? new Date(item.end_time) : null;

        if (start && now < start) {
          item.status = 'upcoming'; // 未开始
        } else if (end && now > end) {
          item.status = 'ended'; // 已结束
        } else {
          item.status = 'published'; // 进行中
        }
      }

      if (resultMap[item.id]) {
        item.userStatus = resultMap[item.id].status;
        item.userScore = resultMap[item.id].score;
      }
      return item;
    });

    return Response.success(res, {
      total: count,
      list,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    return Response.error(res, "获取考试列表失败!", 500, error.message);
  }
};

/**
 * 获取详情
 */
exports.findOne = async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return Response.error(res, "考试不存在", 404);
    return Response.success(res, exam);
  } catch (error) {
    return Response.error(res, "获取详情失败!", 500, error.message);
  }
};

/**
 * 开始考试 (获取试题)
 */
exports.startExam = async (req, res) => {
  try {
    const exam_id = req.params.id;
    const user_id = req.userId;

    const exam = await Exam.findByPk(exam_id);
    if (!exam) return Response.error(res, "考试不存在", 404);

    // 检查考试有效期
    const now = new Date();
    if (exam.start_time && new Date(exam.start_time) > now) {
      return Response.error(res, "考试尚未开始", 400);
    }
    if (exam.end_time && new Date(exam.end_time) < now) {
      // 自动更新状态为 ended
      if (exam.status !== 'ended') {
        await exam.update({ status: 'ended' });
      }
      return Response.error(res, "考试已结束", 400);
    }

    // 检查是否已有进行中的记录
    let result = await ExamResult.findOne({
      where: { exam_id, user_id, status: 'in_progress' }
    });

    // 如果没有进行中的记录，检查是否已有及格的记录
    if (!result) {
      const passedResult = await ExamResult.findOne({
        where: { exam_id, user_id, status: 'completed', is_pass: true }
      });
      if (passedResult) {
        return Response.error(res, "您已通过该考试，无需再次参加", 400);
      }

      // 创建新的考试记录 (支持多次重考)
      result = await ExamResult.create({
        exam_id,
        user_id,
        start_time: new Date(),
        status: 'in_progress'
      });
    }

    // 获取试题 (不含答案)
    const questions = await Question.findAll({
      where: { exam_id },
      attributes: ['id', 'type', 'content', 'options', 'score', 'sort'],
      order: [['sort', 'ASC']]
    });

    return Response.success(res, {
      resultId: result.id,
      duration: exam.duration,
      questions
    });
  } catch (error) {
    return Response.error(res, "无法开始考试!", 500, error.message);
  }
};

/**
 * 提交试卷
 */
exports.submitExam = async (req, res) => {
  try {
    const result_id = req.params.id;
    const { answers } = req.body; // { questionId: answer }

    const result = await ExamResult.findByPk(result_id, { include: [Exam] });
    if (!result) return Response.error(res, "未找到考试记录", 404);
    if (result.status !== 'in_progress') return Response.error(res, "该考试已提交或已失效");

    // 获取标准答案并评分
    const questions = await Question.findAll({ where: { exam_id: result.exam_id } });
    let totalScore = 0;

    questions.forEach(q => {
      const userAnswer = answers[q.id];
      // 答案比对逻辑
      if (q.type === 'multiple') {
        // 多选题答案通常是数组，需要排序后比对
        if (Array.isArray(userAnswer) && Array.isArray(q.answer)) {
          const u = [...userAnswer].sort().join(',');
          const s = [...q.answer].sort().join(',');
          if (u === s) totalScore += q.score;
        }
      } else {
        // 单选/判断
        if (userAnswer === q.answer) {
          totalScore += q.score;
        }
      }
    });

    const isPass = totalScore >= result.exam.pass_score;

    // 只有及格才标记为 completed，否则标记为 failed 允许重考 (或者保持 completed 但通过 is_pass 区分)
    // 业务逻辑：无论是否及格，这次考试记录本身是完成了。重考会创建新记录。
    // 所以这里保持 status='completed'，但 startExam 接口需要允许创建新记录。
    await result.update({
      answers,
      score: totalScore,
      is_pass: isPass,
      submit_time: new Date(),
      status: 'completed'
    });

    // 如果及格，且是首次及格（防止重复刷学时），则记录学时
    if (isPass) {
      // 检查是否已经为此考试记录过学时
      const existingRecord = await db.learningRecord.findOne({
        where: {
          user_id: result.user_id,
          type: 'exam',
          source: `考试及格: ${result.exam.title}` // 简单通过描述匹配，或者最好加个关联字段
          // 更好的做法是在 learning_records 表加个 exam_id 字段，但目前没有
          // 我们可以用 source 存 exam_id 或 title
        }
      });

      if (!existingRecord) {
        // 计算学时：可以使用考试时长折算，或者固定值
        // 这里假设每 45 分钟折算 1 学时，不足按比例
        // 或者简单点：及格给 1 学时，优秀给 2 学时
        // 按照 duration (分钟) / 45 计算
        const hours = (result.exam.duration / 45).toFixed(1);
        
        await db.learningRecord.create({
          user_id: result.user_id,
          hours: parseFloat(hours) || 0.5, // 至少 0.5
          type: 'exam',
          acquire_time: new Date(),
          source: `考试及格: ${result.exam.title}`
        });
      }
    }

    return Response.success(res, {
      score: totalScore,
      isPass
    }, "提交成功");
  } catch (error) {
    return Response.error(res, "提交失败!", 500, error.message);
  }
};

/**
 * 创建考试
 */
exports.create = async (req, res) => {
  try {
    const { questions, start_time, end_time, ...examData } = req.body;
    
    // 时间校验
    if (start_time && end_time) {
      const start = new Date(start_time);
      const end = new Date(end_time);
      const now = new Date();

      if (start < now) {
        // 如果开始时间设为过去，自动修正为当前时间（或者报错，取决于业务需求，这里选择报错提示更严谨）
        // return Response.error(res, "考试开始时间不能早于当前时间", 400);
      }
      if (end <= start) {
        return Response.error(res, "考试结束时间必须晚于开始时间", 400);
      }
    }

    // 事务处理
    const result = await db.sequelize.transaction(async (t) => {
      const exam = await Exam.create({
        ...examData,
        start_time,
        end_time,
        created_by: req.userId,
        question_count: questions ? questions.length : 0
      }, { transaction: t });

      if (questions && questions.length > 0) {
        const questionData = questions.map(q => ({ ...q, exam_id: exam.id }));
        await Question.bulkCreate(questionData, { transaction: t });
      }

      return exam;
    });

    return Response.success(res, result, "考试发布成功", 201);
  } catch (error) {
    return Response.error(res, "无法创建考试!", 500, error.message);
  }
};

/**
 * 更新考试
 */
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const { start_time, end_time } = req.body;

    // 时间校验
    if (start_time && end_time) {
      const start = new Date(start_time);
      const end = new Date(end_time);
      if (end <= start) {
        return Response.error(res, "考试结束时间必须晚于开始时间", 400);
      }
    }

    const exam = await Exam.findByPk(id);
    if (!exam) return Response.error(res, "考试不存在", 404);

    // 如果修改了结束时间，且新的结束时间晚于当前时间，且当前状态为 ended，则尝试自动恢复为 published
    let newStatus = exam.status;
    if (end_time) {
      const now = new Date();
      if (new Date(end_time) > now && exam.status === 'ended') {
        newStatus = 'published';
      }
    }
    // 如果前端明确传了 status，则以前端为准
    if (req.body.status) {
      newStatus = req.body.status;
    }

    await exam.update({ ...req.body, status: newStatus });
    return Response.success(res, exam, "更新成功");
  } catch (error) {
    return Response.error(res, "更新失败!", 500, error.message);
  }
};

/**
 * 获取考试成绩列表 (管理员/讲师)
 */
exports.getResults = async (req, res) => {
  try {
    const exam_id = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const exam = await Exam.findByPk(exam_id);
    if (!exam) return Response.error(res, "考试不存在", 404);

    // 权限检查：如果是讲师，只能查看自己创建的考试的成绩
    // 或者如果讲师也能查看所有发布的考试，这里可以放宽
    // 既然 findAll 已经允许讲师查看所有 published，这里也保持一致？
    // 通常成绩数据比较敏感，建议严格一点：只能看自己创建的，或者管理员看所有
    const user = await db.user.findByPk(req.userId, { include: [db.role] });
    if (user.role.name === 'trainer' && exam.created_by !== req.userId) {
       // 如果不是自己创建的，但如果是 published 且讲师有权查看？
       // 暂时限制为只能查看自己创建的，除非业务要求开放
       return Response.error(res, "无权查看此考试成绩", 403);
    }

    const { count, rows } = await ExamResult.findAndCountAll({
      where: { exam_id, status: 'completed' }, // 只看已完成的？或者所有状态？
      // 通常成绩单只关心已提交的。in_progress 的可能没意义
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: db.user, attributes: ['username', 'employee_id', 'department'] }
      ],
      order: [['score', 'DESC']] // 按分数倒序
    });

    return Response.success(res, {
      total: count,
      list: rows,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    return Response.error(res, "获取成绩失败!", 500, error.message);
  }
};

/**
 * 删除考试
 */
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const exam = await Exam.findByPk(id);
    if (!exam) return Response.error(res, "考试不存在", 404);

    await db.sequelize.transaction(async (t) => {
      // 删除关联试题
      await Question.destroy({ where: { exam_id: id }, transaction: t });
      // 删除考试
      await exam.destroy({ transaction: t });
    });

    return Response.success(res, {}, "删除成功");
  } catch (error) {
    return Response.error(res, "删除失败!", 500, error.message);
  }
};

/**
 * 获取指定考试的所有题目 (管理员/讲师)
 */
exports.findAllQuestions = async (req, res) => {
  try {
    const exam_id = req.params.id;
    const questions = await Question.findAll({
      where: { exam_id },
      order: [['sort', 'ASC'], ['id', 'ASC']]
    });
    return Response.success(res, questions);
  } catch (error) {
    return Response.error(res, "获取题目列表失败!", 500, error.message);
  }
};

/**
 * 保存题目 (新增/更新)
 */
exports.saveQuestions = async (req, res) => {
  try {
    const exam_id = req.params.id;
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return Response.error(res, "无效的题目数据", 400);
    }

    await db.sequelize.transaction(async (t) => {
      // 先删除旧题目 (或者根据 ID 增量更新，这里简化为全量覆盖)
      await Question.destroy({ where: { exam_id }, transaction: t });

      if (questions.length > 0) {
        const questionData = questions.map((q, index) => ({
          ...q,
          exam_id,
          sort: q.sort || index
        }));
        await Question.bulkCreate(questionData, { transaction: t });
      }

      // 更新考试题目数量
      await Exam.update({ question_count: questions.length }, { 
        where: { id: exam_id }, 
        transaction: t 
      });
    });

    return Response.success(res, {}, "题目保存成功");
  } catch (error) {
    return Response.error(res, "题目保存失败!", 500, error.message);
  }
};

/**
 * 辅助函数：解析文本块生成题目列表 (Word/PDF 通用逻辑)
 * @param {string} text 提取的纯文本
 */
const parseTextToQuestions = (text, exam_id) => {
  // 1. 预处理：统一换行符，移除空行
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const questions = [];
  let currentQuestion = null;

  lines.forEach((line, index) => {
    // 2. 增强正则匹配 (兼容全角/半角标点，兼容不同空格)
    
    // 识别题目开始 (例如 "1. 题目"、"1、题目"、"1 题目")
    const questionMatch = line.match(/^(\d+)\s*[\.、．\s]\s*(.+)/);
    
    // 识别选项 (例如 "A. 选项"、"A、选项"、"(A) 选项"、"A 选项")
    const optionMatch = line.match(/^[\(（]?\s*([A-Z])\s*[\)）\.、．\s]\s*(.+)/i);
    
    // 识别答案 (例如 "答案：A"、"【答案】A"、"Answer: A")
    const answerMatch = line.match(/^(?:答案|Answer|正确答案)\s*[:：]\s*([A-Z,，\s]+)/i);
    
    // 识别解析 (例如 "解析：..."、"【解析】...")
    const analysisMatch = line.match(/^(?:解析|Analysis|题目解析)\s*[:：]\s*(.+)/i);
    
    // 识别分值 (例如 "分值：5"、"分数：5")
    const scoreMatch = line.match(/^(?:分值|分数|Score)\s*[:：]\s*(\d+)/i);

    if (questionMatch) {
      // 保存上一题
      if (currentQuestion) {
        finalizeQuestion(currentQuestion);
        questions.push(currentQuestion);
      }
      
      // 开始新题
      currentQuestion = {
        exam_id,
        content: questionMatch[2],
        options: {},
        answer: '',
        score: 5, // 默认分值
        analysis: '',
        sort: questions.length
      };
    } else if (optionMatch && currentQuestion) {
      const key = optionMatch[1].toUpperCase();
      currentQuestion.options[key] = optionMatch[2];
    } else if (answerMatch && currentQuestion) {
      let ans = answerMatch[1].toUpperCase().replace(/，/g, ',').replace(/\s+/g, '');
      currentQuestion.answer = ans;
    } else if (analysisMatch && currentQuestion) {
      currentQuestion.analysis = analysisMatch[1];
    } else if (scoreMatch && currentQuestion) {
      currentQuestion.score = parseInt(scoreMatch[1]);
    } else if (currentQuestion) {
      // 3. 多行内容处理：如果当前行不符合任何特征，且不是新题，则追加到上一行内容中
      // 优先追加到解析，其次是选项，最后是题目内容
      if (currentQuestion.analysis) {
        currentQuestion.analysis += '\n' + line;
      } else if (Object.keys(currentQuestion.options).length > 0) {
        // 获取最后一个选项的 key
        const keys = Object.keys(currentQuestion.options);
        const lastKey = keys[keys.length - 1];
        currentQuestion.options[lastKey] += ' ' + line;
      } else {
        currentQuestion.content += '\n' + line;
      }
    }
  });

  // 保存最后一题
  if (currentQuestion) {
    finalizeQuestion(currentQuestion);
    questions.push(currentQuestion);
  }

  return questions;
};

// 辅助函数：完善题目信息 (自动推断类型)
const finalizeQuestion = (q) => {
  if (q.answer) {
    if (q.answer.length > 1 && q.answer.includes(',')) {
      q.type = 'multiple';
      q.answer = q.answer.split(',').map(s => s.trim().toUpperCase());
    } else if (q.answer.length > 1) { // 如 "AB"
       q.type = 'multiple';
       q.answer = q.answer.split('').map(s => s.trim().toUpperCase());
    } else {
       q.type = 'single';
       // 判断题检测
       if (Object.keys(q.options).length === 2 && 
           (JSON.stringify(q.options).includes('正确') || JSON.stringify(q.options).includes('对'))) {
         q.type = 'truefalse';
       }
    }
  } else {
    // 默认兜底
    q.type = 'single';
  }
};

/**
 * 导入题目 (Excel/Word/PDF)
 */
exports.importQuestions = async (req, res) => {
  try {
    const exam_id = req.params.id;
    if (!req.file) {
      return Response.error(res, "请上传文件", 400);
    }

    let questions = [];
    const ext = req.file.originalname.split('.').pop().toLowerCase();

    if (['xlsx', 'xls'].includes(ext)) {
      // Excel 解析逻辑 (保持原有逻辑)
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(sheet);

      if (rawData.length === 0) {
        fs.unlinkSync(req.file.path);
        return Response.error(res, "Excel 文件内容为空", 400);
      }

      rawData.forEach((row, index) => {
        // ... (原 Excel 解析逻辑，略作封装或保留)
        const typeMap = { '单选题': 'single', '多选题': 'multiple', '判断题': 'truefalse' };
        const type = typeMap[row['题目类型']] || 'single';
        
        let options = {};
        if (type === 'truefalse') {
          options = { 'A': '正确', 'B': '错误' };
        } else {
          if (row['选项A']) options['A'] = row['选项A'];
          if (row['选项B']) options['B'] = row['选项B'];
          if (row['选项C']) options['C'] = row['选项C'];
          if (row['选项D']) options['D'] = row['选项D'];
        }

        let answer = row['正确答案'];
        if (type === 'multiple' && answer) {
          answer = answer.replace(/，/g, ',').split(/[,|]/).map(s => s.trim().toUpperCase());
        } else if (answer) {
          answer = answer.trim().toUpperCase();
        }

        questions.push({
          exam_id,
          type,
          content: row['题目内容'],
          options,
          answer,
          score: row['分值'] || 5,
          analysis: row['解析'] || '',
          sort: index
        });
      });
    } else if (ext === 'docx') {
      // Word 解析
      const result = await mammoth.extractRawText({ path: req.file.path });
      questions = parseTextToQuestions(result.value, exam_id);
    } else if (ext === 'pdf') {
      // PDF 解析
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      questions = parseTextToQuestions(data.text, exam_id);
    } else {
      fs.unlinkSync(req.file.path);
      return Response.error(res, "不支持的文件格式", 400);
    }

    if (questions.length === 0) {
      fs.unlinkSync(req.file.path);
      return Response.error(res, "未能识别出有效题目，请检查文件格式", 400);
    }

    await db.sequelize.transaction(async (t) => {
      // 增量添加
      await Question.bulkCreate(questions, { transaction: t });
      
      // 更新题目数量
      const count = await Question.count({ where: { exam_id }, transaction: t });
      await Exam.update({ question_count: count }, { where: { id: exam_id }, transaction: t });
    });

    // 清理临时文件
    fs.unlinkSync(req.file.path);

    return Response.success(res, { count: questions.length }, `成功导入 ${questions.length} 道题目`);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return Response.error(res, "导入失败!", 500, error.message);
  }
};

/**
 * AI 生成题目（支持上传文件）
 */
exports.generateQuestions = async (req, res) => {
  try {
    const exam_id = req.params.id;
    const { text, singleCount = 5, multipleCount = 3, truefalseCount = 2, score = 5 } = req.body;

    let content = text || "";

    // 1. 如果上传了文件，解析提取文本
    if (req.file) {
      const ext = req.file.originalname.split(".").pop().toLowerCase();

      if (["xlsx", "xls"].includes(ext)) {
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 });
        // 将所有单元格文本拼接
        content = rows
          .flat()
          .filter(Boolean)
          .map(String)
          .join("\n");
      } else if (ext === "docx") {
        const result = await mammoth.extractRawText({ path: req.file.path });
        content = result.value;
      } else if (ext === "pdf") {
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdf(dataBuffer);
        content = data.text;
      } else {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return Response.error(res, "不支持的文件格式，请上传 xlsx/docx/pdf", 400);
      }

      // 清理临时文件
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }

    // 2. 如果没有文件也没有手动文本，从考试关联的培训中提取
    if (!content) {
      const exam = await Exam.findByPk(exam_id, {
        include: [{ model: db.training, attributes: ["title", "content", "description"] }],
      });
      if (!exam) return Response.error(res, "考试不存在", 404);

      if (exam.training && exam.training.content) {
        content = exam.training.content.replace(/<[^>]+>/g, "").trim();
      }
      if ((!content || content.length < 50) && exam.training) {
        const desc = (exam.training.description || "").replace(/<[^>]+>/g, "").trim();
        content = content ? content + "\n" + desc : desc;
      }
    }

    if (!content || content.length < 50) {
      return Response.error(res, "素材内容不足（需至少50字），请上传文件或手动输入文本", 400);
    }

    // 限制内容长度
    if (content.length > 20000) {
      content = content.substring(0, 20000);
    }

    const aiUtil = require("../utils/ai");
    const questions = await aiUtil.generateQuestions(content, {
      singleCount: parseInt(singleCount),
      multipleCount: parseInt(multipleCount),
      truefalseCount: parseInt(truefalseCount),
      score: parseInt(score),
    });

    return Response.success(res, { questions }, `AI 成功生成 ${questions.length} 道题目`);
  } catch (error) {
    // 清理可能的临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (error.message.includes("API key") || error.message.includes("Incorrect API key")) {
      return Response.error(res, "AI 服务未配置，请联系管理员设置 API Key", 500);
    }
    return Response.error(res, "AI 生成失败: " + error.message, 500);
  }
};

/**
 * 删除单个题目
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const id = req.params.id;
    const question = await Question.findByPk(id);
    if (!question) return Response.error(res, "题目不存在", 404);

    const exam_id = question.exam_id;

    await db.sequelize.transaction(async (t) => {
      await question.destroy({ transaction: t });
      // 更新题目数量
      const count = await Question.count({ where: { exam_id }, transaction: t });
      await Exam.update({ question_count: count }, { where: { id: exam_id }, transaction: t });
    });

    return Response.success(res, {}, "题目删除成功");
  } catch (error) {
    return Response.error(res, "删除失败!", 500, error.message);
  }
};
