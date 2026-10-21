'use strict';

class PlayerAchievementModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('PlayerAchievement', {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        field: 'user_id',
      },
      achievementId: {
        type: DataTypes.STRING(40),
        primaryKey: true,
        field: 'achievement_id',
      },
      unlockedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'unlocked_at',
      },
    }, {
      tableName: 'player_achievements',
      timestamps: false,
    });
  }
}

module.exports = PlayerAchievementModel;
