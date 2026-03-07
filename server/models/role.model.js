module.exports = (sequelize, Sequelize) => {
  const Role = sequelize.define("role", {
    name: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    description: {
      type: Sequelize.STRING(255)
    },
    permissions: {
      type: Sequelize.JSON
    }
  });

  return Role;
};
