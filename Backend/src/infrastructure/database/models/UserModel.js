'use strict';

class UserModel {
  static define(sequelize, DataTypes) {
    return sequelize.define('User', {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    }, {
      tableName: 'users',
      timestamps: true,
    });
  }
}

module.exports = UserModel;