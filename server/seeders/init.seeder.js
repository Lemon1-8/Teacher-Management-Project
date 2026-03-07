const db = require("../models");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

const Role = db.role;
const User = db.user;
const TrainingType = db.trainingType;

const initialData = async () => {
  try {
    // 1. 初始化角色
    const countRoles = await Role.count();
    if (countRoles === 0) {
      await Role.bulkCreate([
        { id: 1, name: "admin", description: "系统管理员，拥有所有权限" },
        { id: 2, name: "teacher", description: "普通教师，可参加培训和考试" },
        { id: 3, name: "trainer", description: "培训讲师，可创建和管理培训项目" }
      ]);
      logger.info("角色数据初始化成功");
    }

    // 2. 初始化管理员用户
    const countUsers = await User.count();
    if (countUsers === 0) {
      await User.create({
        employee_id: "admin",
        username: "系统管理员",
        password: bcrypt.hashSync("admin123", 8),
        role_id: 1, // admin
        department: "信息中心",
        status: 1
      });
      logger.info("默认管理员 (admin/admin123) 创建成功");
    }

    // 3. 初始化培训类型
    const countTypes = await TrainingType.count();
    if (countTypes === 0) {
      await TrainingType.bulkCreate([
        { name: "专业技术", icon: "tech", sort: 1 },
        { name: "教学教研", icon: "edu", sort: 2 },
        { name: "师德师风", icon: "ethics", sort: 3 },
        { name: "信息化能力", icon: "info", sort: 4 }
      ]);
      logger.info("培训类型数据初始化成功");
    }

  } catch (error) {
    logger.error("数据初始化失败: " + error.message);
  }
};

module.exports = initialData;
