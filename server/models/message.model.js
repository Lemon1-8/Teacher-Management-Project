module.exports = (sequelize, Sequelize) => {
  const Message = sequelize.define("messages", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    is_read: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    created_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  });

  return Message;
};