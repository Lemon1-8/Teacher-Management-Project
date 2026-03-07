module.exports = (sequelize, Sequelize) => {
  const Notification = sequelize.define("notification", {
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    title: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    content: {
      type: Sequelize.TEXT
    },
    type: {
      type: Sequelize.ENUM('system', 'training', 'exam'),
      defaultValue: 'system'
    },
    is_read: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    link: {
      type: Sequelize.STRING(255) // 可选的跳转链接
    }
  });

  return Notification;
};
