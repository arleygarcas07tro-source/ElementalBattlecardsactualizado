'use strict';

class CardModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('Card', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      element: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      level: {
        type: DataTypes.SMALLINT,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
    }, {
      tableName: 'cards',
      timestamps: false,
    });
  }
}

module.exports = CardModel;
