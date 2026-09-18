'use strict';

const ILogger = require('../../core/ILogger');

class DatabaseInitializer {
  constructor({ sequelize, logger, dbRequireSSL = false }) {
    if (!sequelize) {
      throw new TypeError('[DatabaseInitializer] Falta la instancia de Sequelize.');
    }
    ILogger.assert(logger);

    this.sequelize = sequelize;
    this.logger = logger;
    this.dbRequireSSL = dbRequireSSL;
  }

  async connect() {
    await this.sequelize.authenticate();
    this.logger.info('DB conectado y SSL:', this.dbRequireSSL);
    return this.sequelize;
  }

  async sync() {
    await this.sequelize.sync({ alter: true });
    return this.sequelize;
  }
}

module.exports = DatabaseInitializer;