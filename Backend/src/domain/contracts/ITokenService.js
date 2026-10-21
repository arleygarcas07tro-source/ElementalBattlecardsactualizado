'use strict';

const assertContract = require('../../core/assertContract');

const METHODS = ['sign', 'verify'];

class ITokenService {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'ITokenService');
  }

  sign() {
    throw new Error('[ITokenService] Método abstracto sign() no implementado.');
  }

  verify() {
    throw new Error('[ITokenService] Método abstracto verify() no implementado.');
  }
}

module.exports = ITokenService;
