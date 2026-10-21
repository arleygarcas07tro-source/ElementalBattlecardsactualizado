'use strict';

const assertContract = require('../../core/assertContract');

const METHODS = ['generate'];

class IRoomCodeGenerator {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IRoomCodeGenerator', IRoomCodeGenerator);
  }

  generate() {
    throw new Error('[IRoomCodeGenerator] Método abstracto generate() no implementado.');
  }
}

module.exports = IRoomCodeGenerator;