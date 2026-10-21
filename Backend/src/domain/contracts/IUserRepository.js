'use strict';

const assertContract = require('../../core/assertContract');

const METHODS = ['findByUsername', 'findByEmail', 'create'];

class IUserRepository {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IUserRepository');
  }

  findByUsername() {
    throw new Error('[IUserRepository] Método abstracto findByUsername() no implementado.');
  }

  findByEmail() {
    throw new Error('[IUserRepository] Método abstracto findByEmail() no implementado.');
  }

  create() {
    throw new Error('[IUserRepository] Método abstracto create() no implementado.');
  }
}

module.exports = IUserRepository;
