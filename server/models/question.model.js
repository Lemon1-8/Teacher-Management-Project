module.exports = (sequelize, Sequelize) => {
  const Question = sequelize.define("question", {
    exam_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    type: {
      type: Sequelize.ENUM('single', 'multiple', 'truefalse'),
      allowNull: false
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    options: {
      type: Sequelize.JSON
    },
    answer: {
      type: Sequelize.JSON
    },
    score: {
      type: Sequelize.INTEGER,
      defaultValue: 1
    },
    analysis: {
      type: Sequelize.TEXT
    },
    sort: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  });

  return Question;
};
