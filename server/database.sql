-- 数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS teacher_training CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE teacher_training;

-- 1. 角色表 (roles)
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '角色名称(admin/teacher/trainer)',
  `description` VARCHAR(255) DEFAULT NULL COMMENT '角色描述',
  `permissions` JSON DEFAULT NULL COMMENT '权限列表',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 2. 用户表 (users)
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` VARCHAR(20) NOT NULL UNIQUE COMMENT '工号',
  `username` VARCHAR(50) NOT NULL COMMENT '姓名',
  `password` VARCHAR(255) NOT NULL COMMENT '加密密码',
  `gender` ENUM('male', 'female', 'other') DEFAULT 'male' COMMENT '性别',
  `department` VARCHAR(100) DEFAULT NULL COMMENT '所属部门',
  `title` VARCHAR(50) DEFAULT NULL COMMENT '职称',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `role_id` INT DEFAULT NULL COMMENT '角色ID',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  `status` TINYINT DEFAULT 1 COMMENT '状态(1正常/0禁用)',
  `last_login` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 3. 培训类型表 (training_types)
CREATE TABLE `training_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '类型名称',
  `icon` VARCHAR(255) DEFAULT NULL COMMENT '图标',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `status` TINYINT DEFAULT 1 COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='培训类型表';

-- 4. 培训表 (trainings)
CREATE TABLE `trainings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL COMMENT '培训标题',
  `type_id` INT DEFAULT NULL COMMENT '培训类型ID',
  `cover` VARCHAR(255) DEFAULT NULL COMMENT '封面图',
  `description` TEXT DEFAULT NULL COMMENT '培训介绍',
  `content` LONGTEXT DEFAULT NULL COMMENT '详细内容(富文本)',
  `speaker` VARCHAR(100) DEFAULT NULL COMMENT '主讲人',
  `speaker_intro` TEXT DEFAULT NULL COMMENT '主讲人介绍',
  `location` VARCHAR(200) DEFAULT NULL COMMENT '培训地点',
  `start_time` DATETIME DEFAULT NULL COMMENT '开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
  `total_hours` DECIMAL(5,2) DEFAULT 0.00 COMMENT '总学时',
  `credit_hours` DECIMAL(5,2) DEFAULT 0.00 COMMENT '认定学时',
  `max_students` INT DEFAULT 0 COMMENT '最大人数',
  `current_students` INT DEFAULT 0 COMMENT '当前报名人数',
  `status` ENUM('draft', 'published', 'ended', 'cancelled') DEFAULT 'draft' COMMENT '状态',
  `materials` JSON DEFAULT NULL COMMENT '资料列表',
  `created_by` INT DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`type_id`) REFERENCES `training_types`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='培训表';

-- 5. 报名表 (enrollments)
CREATE TABLE `enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `training_id` INT NOT NULL COMMENT '培训ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `enroll_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
  `status` ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '状态',
  `attendance_status` ENUM('absent', 'present', 'late', 'leave') DEFAULT 'absent' COMMENT '考勤状态',
  `evaluation_score` INT DEFAULT NULL COMMENT '评估分数',
  `evaluation_comment` TEXT DEFAULT NULL COMMENT '评估评语',
  `evaluation_time` DATETIME DEFAULT NULL COMMENT '评估时间',
  `certificate_url` VARCHAR(255) DEFAULT NULL COMMENT '证书地址',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报名表';

-- 6. 考试表 (exams)
CREATE TABLE `exams` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL COMMENT '考试标题',
  `training_id` INT DEFAULT NULL COMMENT '关联培训ID(可选)',
  `description` TEXT DEFAULT NULL COMMENT '考试说明',
  `duration` INT DEFAULT 60 COMMENT '考试时长(分钟)',
  `total_score` INT DEFAULT 100 COMMENT '总分',
  `pass_score` INT DEFAULT 60 COMMENT '及格分',
  `start_time` DATETIME DEFAULT NULL COMMENT '开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
  `question_count` INT DEFAULT 0 COMMENT '题目数量',
  `status` ENUM('draft', 'published', 'ended') DEFAULT 'draft' COMMENT '状态',
  `created_by` INT DEFAULT NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试表';

-- 7. 试题表 (questions)
CREATE TABLE `questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `exam_id` INT NOT NULL COMMENT '所属考试ID',
  `type` ENUM('single', 'multiple', 'truefalse') NOT NULL COMMENT '类型',
  `content` TEXT NOT NULL COMMENT '题目内容',
  `options` JSON DEFAULT NULL COMMENT '选项',
  `answer` JSON DEFAULT NULL COMMENT '正确答案',
  `score` INT DEFAULT 1 COMMENT '分值',
  `analysis` TEXT DEFAULT NULL COMMENT '解析',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='试题表';

-- 8. 考试成绩表 (exam_results)
CREATE TABLE `exam_results` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `exam_id` INT NOT NULL COMMENT '考试ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `answers` JSON DEFAULT NULL COMMENT '用户答案',
  `score` INT DEFAULT 0 COMMENT '得分',
  `is_pass` BOOLEAN DEFAULT FALSE COMMENT '是否及格',
  `start_time` DATETIME DEFAULT NULL COMMENT '开始时间',
  `submit_time` DATETIME DEFAULT NULL COMMENT '提交时间',
  `duration_used` INT DEFAULT 0 COMMENT '用时(秒)',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT '考试IP',
  `status` ENUM('in_progress', 'completed', 'expired') DEFAULT 'in_progress' COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试成绩表';

-- 9. 学时记录表 (learning_records)
CREATE TABLE `learning_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `training_id` INT DEFAULT NULL COMMENT '培训ID',
  `hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '获得学时',
  `type` ENUM('training', 'exam', 'other') DEFAULT 'training' COMMENT '类型',
  `acquire_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '获得时间',
  `source` VARCHAR(100) DEFAULT NULL COMMENT '来源描述',
  `certificate_id` VARCHAR(100) DEFAULT NULL COMMENT '证书编号',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学时记录表';

-- 10. 通知公告表 (notifications)
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL COMMENT '标题',
  `content` TEXT DEFAULT NULL COMMENT '内容',
  `type` ENUM('system', 'training', 'exam') DEFAULT 'system' COMMENT '类型',
  `target_type` ENUM('all', 'department', 'role', 'user') DEFAULT 'all' COMMENT '目标类型',
  `target_ids` JSON DEFAULT NULL COMMENT '目标ID列表',
  `is_read` BOOLEAN DEFAULT FALSE COMMENT '是否已读',
  `created_by` INT DEFAULT NULL COMMENT '发布人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `expires_at` DATETIME DEFAULT NULL COMMENT '过期时间',
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知公告表';

-- 11. 系统日志表 (system_logs)
CREATE TABLE `system_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL COMMENT '操作用户',
  `action` VARCHAR(100) NOT NULL COMMENT '操作类型',
  `module` VARCHAR(50) DEFAULT NULL COMMENT '操作模块',
  `content` TEXT DEFAULT NULL COMMENT '操作内容',
  `ip` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(255) DEFAULT NULL COMMENT '浏览器信息',
  `result` ENUM('success', 'fail') DEFAULT 'success' COMMENT '结果',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统日志表';

-- 12. 消息表 (messages)
CREATE TABLE `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sender_id` INT NOT NULL COMMENT '发送者ID',
  `receiver_id` INT NOT NULL COMMENT '接收者ID',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `is_read` BOOLEAN DEFAULT FALSE COMMENT '是否已读',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息表';
