'use strict';

class PlayerStatsModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('PlayerStats', {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        field: 'user_id',
      },
      battlesPlayed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'battles_played',
      },
      battlesWon: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'battles_won',
      },
      battlesLost: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'battles_lost',
      },
      currentStreak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'current_streak',
      },
      longestStreak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'longest_streak',
      },
      gems: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    }, {
      tableName: 'player_stats',
      timestamps: false,
    });
  }
}

module.exports = PlayerStatsModel;
