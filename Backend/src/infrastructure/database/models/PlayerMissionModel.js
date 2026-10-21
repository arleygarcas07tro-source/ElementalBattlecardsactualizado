'use strict';

class PlayerMissionModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('PlayerMission', {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        field: 'user_id',
      },
      missionId: {
        type: DataTypes.STRING(40),
        primaryKey: true,
        field: 'mission_id',
      },
      progress: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at',
      },
    }, {
      tableName: 'player_missions',
      timestamps: false,
    });
  }
}

module.exports = PlayerMissionModel;
