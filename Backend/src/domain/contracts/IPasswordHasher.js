'use strict';

const assertContract = require('../../core/assertContract');

const METHODS = ['hash', 'compare'];

class IPasswordHasher {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IPasswordHasher');
  }

  hash() {
    throw new Error('[IPasswordHasher] Método abstracto hash() no implementado.');
  }

  compare() {
    throw new Error('[IPasswordHasher] Método abstracto compare() no implementado.');
  }
}

module.exports = IPasswordHasher;
