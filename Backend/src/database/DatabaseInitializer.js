'use strict';

const assertContract = require('../core/assertContract');

class DatabaseInitializer {
  constructor({ sequelize, logger, dbRequireSSL = false }) {
    if (!sequelize) {
      throw new TypeError('[DatabaseInitializer] Falta la instancia de Sequelize.');
    }
    assertContract(logger, ['info', 'error', 'warn'], 'Logger');

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