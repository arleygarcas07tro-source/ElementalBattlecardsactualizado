'use strict';

class PlayerAttackTypeModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('PlayerAttackType', {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        field: 'user_id',
      },
      element: {
        type: DataTypes.STRING(20),
        primaryKey: true,
      },
    }, {
      tableName: 'player_attack_types',
      timestamps: false,
    });
  }
}

module.exports = PlayerAttackTypeModel;
