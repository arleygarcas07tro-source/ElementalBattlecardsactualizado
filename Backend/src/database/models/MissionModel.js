'use strict';

class MissionModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('Mission', {
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
      target: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      rewardGems: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'reward_gems',
      },
    }, {
      tableName: 'missions',
      timestamps: false,
    });
  }
}

module.exports = MissionModel;
