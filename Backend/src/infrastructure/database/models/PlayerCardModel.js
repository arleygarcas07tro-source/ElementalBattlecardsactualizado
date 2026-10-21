'use strict';

class PlayerCardModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('PlayerCard', {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        field: 'user_id',
      },
      cardId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        field: 'card_id',
      },
      collectedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'collected_at',
      },
    }, {
      tableName: 'player_cards',
      timestamps: false,
    });
  }
}

module.exports = PlayerCardModel;
