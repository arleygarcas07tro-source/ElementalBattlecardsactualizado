'use strict';

const { DataTypes } = require('sequelize');
const UserModel = require('./UserModel');

function buildModels(sequelize) {
  if (!sequelize) {
    throw new TypeError('[ModelRegistry] Falta la instancia de Sequelize.');
  }

  const models = {};
  models.User = UserModel.define(sequelize, DataTypes);
  return models;
}

module.exports = buildModels;