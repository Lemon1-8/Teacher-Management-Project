module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("user", {
    employee_id: {
      type: Sequelize.STRING(20),
      unique: true,
      allowNull: false
    },
    username: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    password: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    gender: {
      type: Sequelize.ENUM('male', 'female', 'other'),
      defaultValue: 'male'
    },
    department: {
      type: Sequelize.STRING(100)
    },
    title: {
      type: Sequelize.STRING(50)
    },
    email: {
      type: Sequelize.STRING(100)
    },
    phone: {
      type: Sequelize.STRING(20)
    },
    role_id: {
      type: Sequelize.INTEGER
    },
    avatar: {
      type: Sequelize.STRING(255)
    },
    status: {
      type: Sequelize.TINYINT,
      defaultValue: 1
    },
    last_login: {
      type: Sequelize.DATE
    }
  });

  return User;
};
