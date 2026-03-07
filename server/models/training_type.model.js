module.exports = (sequelize, Sequelize) => {
  const TrainingType = sequelize.define("training_type", {
    name: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    icon: {
      type: Sequelize.STRING(255)
    },
    sort: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    status: {
      type: Sequelize.TINYINT,
      defaultValue: 1
    }
  });

  return TrainingType;
};
