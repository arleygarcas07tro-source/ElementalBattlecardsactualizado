'use strict';

const assertContract = require('../core/assertContract');

const METHODS = ['hash', 'compare'];

class IPasswordHasher {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IPasswordHasher');
  }
}

module.exports = IPasswordHasher;