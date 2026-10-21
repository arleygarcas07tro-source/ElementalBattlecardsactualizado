'use strict';

require('dotenv').config();

const { Client } = require('pg');

const AppConfig = require('../src/core/config');
const Logger = require('../src/core/logger');
const DatabaseFactory = require('../src/database/DatabaseFactory');
const DatabaseInitializer = require('../src/database/DatabaseInitializer');
const buildModels = require('../src/database/models');

class DatabaseBootstrap {
  constructor({ config, logger }) {
    this.config = config;
    this.logger = logger;
  }

  get databaseName() {
    return this.config.dbName;
  }

  async ensureDatabaseExists() {
    if (this.config.useSqlite) {
      this.logger.info('Modo SQLite detectado: no se requiere crear base de datos.');
      return;
    }

    const maintenance = new Client({
      host: this.config.dbHost,
      port: this.config.dbPort,
      user: this.config.dbUser,
      password: this.config.dbPass,
      database: 'postgres',
    });

    await maintenance.connect();
    try {
      const { rowCount } = await maintenance.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this.databaseName]
      );

      if (rowCount > 0) {
        this.logger.info(`La base de datos "${this.databaseName}" ya existe.`);
        return;
      }

      const identifier = `"${this.databaseName.replace(/"/g, '""')}"`;
      await maintenance.query(`CREATE DATABASE ${identifier}`);
      this.logger.info(`Base de datos "${this.databaseName}" creada.`);
    } finally {
      await maintenance.end();
    }
  }

  async syncSchema() {
    const sequelize = new DatabaseFactory(this.config).build();
    const initializer = new DatabaseInitializer({
      sequelize,
      logger: this.logger,
      dbRequireSSL: this.config.dbRequireSSL,
    });

    try {
      await initializer.connect();
      buildModels(sequelize);
      await initializer.sync();
      this.logger.info('✓ Esquema sincronizado correctamente.');
    } finally {
      await sequelize.close();
    }
  }

  async run() {
    const dialect = this.config.useSqlite ? 'sqlite' : 'postgres';
    this.logger.info(`Inicializando base de datos (dialecto: ${dialect})...`);
    await this.ensureDatabaseExists();
    await this.syncSchema();
    this.logger.info('✓ Base de datos lista para usar.');
  }
}

async function main() {
  const logger = new Logger();
  try {
    await new DatabaseBootstrap({ config: new AppConfig(), logger }).run();
    process.exit(0);
  } catch (error) {
    logger.error('No se pudo inicializar la base de datos:', error.message || error);
    process.exit(1);
  }
}

main();
