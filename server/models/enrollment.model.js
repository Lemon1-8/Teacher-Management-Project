module.exports = (sequelize, Sequelize) => {
  const Enrollment = sequelize.define("enrollment", {
    training_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    enroll_time: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    },
    status: {
      type: Sequelize.ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    attendance_status: {
      type: Sequelize.ENUM('absent', 'present', 'late', 'leave'),
      defaultValue: 'absent'
    },
    evaluation_score: {
      type: Sequelize.INTEGER
    },
    evaluation_comment: {
      type: Sequelize.TEXT
    },
    evaluation_time: {
      type: Sequelize.DATE
    },
    certificate_url: {
      type: Sequelize.STRING(255)
    }
  });

  return Enrollment;
};
