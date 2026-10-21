'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const AppConfig = require('../src/core/config');

test('AppConfig: valores por defecto en desarrollo', () => {
  const config = new AppConfig({});

  assert.equal(config.port, 3001);
  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.isProduction, false);
  assert.equal(config.corsOrigin, '*');
  assert.equal(config.jwtSecret, 'dev-secret-cambiar-en-produccion');
});

test('AppConfig: lee variables de entorno', () => {
  const config = new AppConfig({
    PORT: '4000',
    NODE_ENV: 'production',
    JWT_SECRET: 's3cr3t',
    CORS_ORIGIN: 'http://juego.local',
  });

  assert.equal(config.port, 4000);
  assert.equal(config.isProduction, true);
  assert.equal(config.jwtSecret, 's3cr3t');
  assert.equal(config.corsOrigin, 'http://juego.local');
});

test('AppConfig: exige JWT_SECRET en producción', () => {
  const config = new AppConfig({ NODE_ENV: 'production' });

  assert.throws(() => config.jwtSecret, /JWT_SECRET/);
});

test('AppConfig: interpreta los flags booleanos de base de datos', () => {
  const config = new AppConfig({
    DB_ENABLED: 'TRUE',
    DB_USE_SQLITE: 'true',
    DB_REQUIRE_SSL: 'false',
  });

  assert.equal(config.dbEnabled, true);
  assert.equal(config.useSqlite, true);
  assert.equal(config.dbRequireSSL, false);
});
