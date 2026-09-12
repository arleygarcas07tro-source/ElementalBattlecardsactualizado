'use strict';

const path = require('path');
const { Sequelize } = require('sequelize');

class DatabaseFactory {
  constructor(config) {
    this.config = config;
  }

  build() {
    if (this.config.useSqlite) {
      return new Sequelize({
        dialect: 'sqlite',
        storage: path.resolve(__dirname, '../../database.sqlite'),
        logging: false,
      });
    }

    const dialectOptions = this.config.dbRequireSSL
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : undefined;

    return new Sequelize(this.config.dbName, this.config.dbUser, this.config.dbPass, {
      host: this.config.dbHost,
      port: this.config.dbPort,
      dialect: 'postgres',
      logging: false,
      dialectOptions,
    });
  }
}

module.exports = DatabaseFactory;