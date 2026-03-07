module.exports = (sequelize, Sequelize) => {
  const LearningRecord = sequelize.define("learning_record", {
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    training_id: {
      type: Sequelize.INTEGER
    },
    hours: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    type: {
      type: Sequelize.ENUM('training', 'exam', 'other'),
      defaultValue: 'training'
    },
    acquire_time: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    },
    source: {
      type: Sequelize.STRING(100)
    },
    certificate_id: {
      type: Sequelize.STRING(100)
    }
  });

  return LearningRecord;
};
