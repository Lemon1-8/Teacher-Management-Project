module.exports = (sequelize, Sequelize) => {
  const Training = sequelize.define("training", {
    title: {
      type: Sequelize.STRING(200),
      allowNull: false
    },
    type_id: {
      type: Sequelize.INTEGER
    },
    cover: {
      type: Sequelize.STRING(255)
    },
    description: {
      type: Sequelize.TEXT
    },
    content: {
      type: Sequelize.TEXT('long')
    },
    speaker: {
      type: Sequelize.STRING(100)
    },
    speaker_intro: {
      type: Sequelize.TEXT
    },
    location: {
      type: Sequelize.STRING(200)
    },
    start_time: {
      type: Sequelize.DATE
    },
    end_time: {
      type: Sequelize.DATE
    },
    total_hours: {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    credit_hours: {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0.00
    },
    max_students: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    current_students: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    status: {
      type: Sequelize.ENUM('draft', 'published', 'ended', 'cancelled'),
      defaultValue: 'draft'
    },
    materials: {
      type: Sequelize.JSON
    },
    created_by: {
      type: Sequelize.INTEGER
    }
  });

  return Training;
};
