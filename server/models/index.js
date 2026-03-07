const dbConfig = require('../config/db.config.js');
const Sequelize = require('sequelize');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: false,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  },
  define: {
    timestamps: true,
    underscored: true
  }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 导入模型
db.user = require('./user.model.js')(sequelize, Sequelize);
db.role = require('./role.model.js')(sequelize, Sequelize);
db.training = require('./training.model.js')(sequelize, Sequelize);
db.trainingType = require('./training_type.model.js')(sequelize, Sequelize);
db.enrollment = require('./enrollment.model.js')(sequelize, Sequelize);
db.exam = require("./exam.model.js")(sequelize, Sequelize);
db.question = require("./question.model.js")(sequelize, Sequelize);
db.examResult = require("./exam_result.model.js")(sequelize, Sequelize);
db.learningRecord = require('./learning_record.model.js')(sequelize, Sequelize);
db.notification = require("./notification.model.js")(sequelize, Sequelize);
db.systemLog = require('./system_log.model.js')(sequelize, Sequelize);
db.message = require('./message.model.js')(sequelize, Sequelize);

// 定义关联关系

// User - Role (N:1)
db.role.hasMany(db.user, { foreignKey: "role_id" });
db.user.belongsTo(db.role, { foreignKey: 'role_id' });

// Training - TrainingType (N:1)
db.trainingType.hasMany(db.training, { foreignKey: 'type_id' });
db.training.belongsTo(db.trainingType, { foreignKey: 'type_id' });

// Training - User (Created By) (N:1)
db.user.hasMany(db.training, { foreignKey: 'created_by' });
db.training.belongsTo(db.user, { foreignKey: 'created_by', as: 'creator' });

// Enrollment - User (N:1)
db.user.hasMany(db.enrollment, { foreignKey: 'user_id' });
db.enrollment.belongsTo(db.user, { foreignKey: 'user_id' });

// Enrollment - Training (N:1)
db.training.hasMany(db.enrollment, { foreignKey: 'training_id' });
db.enrollment.belongsTo(db.training, { foreignKey: 'training_id' });

// Exam - Training (N:1)
db.training.hasMany(db.exam, { foreignKey: 'training_id' });
db.exam.belongsTo(db.training, { foreignKey: 'training_id' });

// Question - Exam (N:1)
db.exam.hasMany(db.question, { foreignKey: 'exam_id' });
db.question.belongsTo(db.exam, { foreignKey: 'exam_id' });

// ExamResult - User (N:1)
db.user.hasMany(db.examResult, { foreignKey: 'user_id' });
db.examResult.belongsTo(db.user, { foreignKey: 'user_id' });

// ExamResult - Exam (N:1)
db.exam.hasMany(db.examResult, { foreignKey: 'exam_id' });
db.examResult.belongsTo(db.exam, { foreignKey: 'exam_id' });

// LearningRecord - User (N:1)
db.user.hasMany(db.learningRecord, { foreignKey: 'user_id' });
db.learningRecord.belongsTo(db.user, { foreignKey: 'user_id' });

// LearningRecord - Training (N:1)
db.training.hasMany(db.learningRecord, { foreignKey: 'training_id' });
db.learningRecord.belongsTo(db.training, { foreignKey: 'training_id' });

// Notification
db.user.hasMany(db.notification, { foreignKey: 'user_id' });
db.notification.belongsTo(db.user, { foreignKey: 'user_id' });

// Message
db.user.hasMany(db.message, { foreignKey: 'sender_id', as: 'sentMessages' });
db.user.hasMany(db.message, { foreignKey: 'receiver_id', as: 'receivedMessages' });
db.message.belongsTo(db.user, { foreignKey: 'sender_id', as: 'sender' });
db.message.belongsTo(db.user, { foreignKey: 'receiver_id', as: 'receiver' });

module.exports = db;
