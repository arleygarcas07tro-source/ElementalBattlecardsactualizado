'use strict';

class BattleModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('Battle', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
      },
      result: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      opponent: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'bot',
      },
      difficulty: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      level3OnField: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'level3_on_field',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    }, {
      tableName: 'battles',
      timestamps: false,
    });
  }
}

module.exports = BattleModel;
