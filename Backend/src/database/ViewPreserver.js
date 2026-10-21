'use strict';

class ViewPreserver {
  constructor(sequelize) {
    if (!sequelize) {
      throw new TypeError('[ViewPreserver] Falta la instancia de Sequelize.');
    }
    this.sequelize = sequelize;
  }

  get isPostgres() {
    return this.sequelize.options.dialect === 'postgres';
  }

  async capture() {
    if (!this.isPostgres) {
      return [];
    }
    const [rows] = await this.sequelize.query(
      `SELECT c.relname AS name, pg_get_viewdef(c.oid, true) AS definition
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'v' AND n.nspname = 'public'`
    );
    return rows;
  }

  async drop(views) {
    if (!this.isPostgres || views.length === 0) {
      return;
    }
    for (const view of views) {
      await this.sequelize.query(`DROP VIEW IF EXISTS "${view.name}"`);
    }
  }

  async restore(views) {
    if (!this.isPostgres || views.length === 0) {
      return;
    }
    for (const view of views) {
      await this.sequelize.query(`CREATE VIEW "${view.name}" AS ${view.definition}`);
    }
  }
}

module.exports = ViewPreserver;