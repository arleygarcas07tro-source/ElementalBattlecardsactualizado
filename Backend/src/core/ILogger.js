'use strict';

const assertContract = require('./assertContract');

const METHODS = ['info', 'warn', 'error'];

class ILogger {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'ILogger', ILogger);
  }

  info() {
    throw new Error('[ILogger] Método abstracto info() no implementado.');
  }

  warn() {
    throw new Error('[ILogger] Método abstracto warn() no implementado.');
  }

  error() {
    throw new Error('[ILogger] Método abstracto error() no implementado.');
  }
}

module.exports = ILogger;