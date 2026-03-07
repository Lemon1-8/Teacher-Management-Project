module.exports = (sequelize, Sequelize) => {
  const Exam = sequelize.define("exam", {
    title: {
      type: Sequelize.STRING(200),
      allowNull: false
    },
    training_id: {
      type: Sequelize.INTEGER
    },
    description: {
      type: Sequelize.TEXT
    },
    duration: {
      type: Sequelize.INTEGER,
      defaultValue: 60
    },
    total_score: {
      type: Sequelize.INTEGER,
      defaultValue: 100
    },
    pass_score: {
      type: Sequelize.INTEGER,
      defaultValue: 60
    },
    start_time: {
      type: Sequelize.DATE
    },
    end_time: {
      type: Sequelize.DATE
    },
    question_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    status: {
      type: Sequelize.ENUM('draft', 'published', 'ended'),
      defaultValue: 'draft'
    },
    created_by: {
      type: Sequelize.INTEGER
    }
  });

  return Exam;
};
