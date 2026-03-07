module.exports = (sequelize, Sequelize) => {
  const SystemLog = sequelize.define("system_log", {
    user_id: {
      type: Sequelize.INTEGER
    },
    action: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    module: {
      type: Sequelize.STRING(50)
    },
    content: {
      type: Sequelize.TEXT
    },
    ip: {
      type: Sequelize.STRING(50)
    },
    user_agent: {
      type: Sequelize.STRING(255)
    },
    result: {
      type: Sequelize.ENUM('success', 'fail'),
      defaultValue: 'success'
    }
  });

  return SystemLog;
};
