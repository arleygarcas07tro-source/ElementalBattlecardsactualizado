'use strict';

const assertContract = require('../../core/assertContract');

const METHODS = ['get', 'set', 'delete', 'all'];

class IRoomStore {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IRoomStore');
  }

  get() {
    throw new Error('[IRoomStore] Método abstracto get() no implementado.');
  }

  set() {
    throw new Error('[IRoomStore] Método abstracto set() no implementado.');
  }

  delete() {
    throw new Error('[IRoomStore] Método abstracto delete() no implementado.');
  }

  all() {
    throw new Error('[IRoomStore] Método abstracto all() no implementado.');
  }
}

module.exports = IRoomStore;
