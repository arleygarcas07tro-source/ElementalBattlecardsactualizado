'use strict';

class AppConfig {
  constructor(env = process.env) {
    this.env = env;
  }

  get port() {
    return Number(this.env.PORT || 3001);
  }

  get nodeEnv() {
    return this.env.NODE_ENV || 'development';
  }

  get corsOrigin() {
    return this.env.CORS_ORIGIN || '*';
  }

  get dbEnabled() {
    return (this.env.DB_ENABLED || 'false').toLowerCase() === 'true';
  }

  get useSqlite() {
    return (this.env.DB_USE_SQLITE || 'false').toLowerCase() === 'true';
  }

  get dbRequireSSL() {
    return (this.env.DB_REQUIRE_SSL || 'true').toString().toLowerCase() === 'true';
  }

  get dbHost() {
    return this.env.DB_HOST || '127.0.0.1';
  }

  get dbPort() {
    return Number(this.env.DB_PORT || 5432);
  }

  get dbName() {
    return this.env.DB_NAME || 'elemental';
  }

  get dbUser() {
    return this.env.DB_USER || 'postgres';
  }

  get dbPass() {
    return this.env.DB_PASS || 'password';
  }

  get jwtSecret() {
    return this.env.JWT_SECRET || 'tu_secreto_super_secreto_y_largo';
  }

  get jwtExpiresIn() {
    return this.env.JWT_EXPIRES_IN || '1h';
  }
}

module.exports = AppConfig;