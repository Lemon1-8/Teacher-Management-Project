module.exports = (sequelize, Sequelize) => {
  const ExamResult = sequelize.define("exam_result", {
    exam_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    answers: {
      type: Sequelize.JSON
    },
    score: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    is_pass: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    start_time: {
      type: Sequelize.DATE
    },
    submit_time: {
      type: Sequelize.DATE
    },
    duration_used: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    ip_address: {
      type: Sequelize.STRING(50)
    },
    status: {
      type: Sequelize.ENUM('in_progress', 'completed', 'expired'),
      defaultValue: 'in_progress'
    }
  });

  return ExamResult;
};
