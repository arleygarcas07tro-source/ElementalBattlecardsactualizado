'use strict';

class AchievementModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('Achievement', {
      id: {
        type: DataTypes.STRING(40),
        primaryKey: true,
      },
      element: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    }, {
      tableName: 'achievements',
      timestamps: false,
    });
  }
}

module.exports = AchievementModel;
