'use strict';

const assertContract = require('../core/assertContract');

const METHODS = ['sign', 'verify'];

class ITokenService {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'ITokenService');
  }
}

module.exports = ITokenService;