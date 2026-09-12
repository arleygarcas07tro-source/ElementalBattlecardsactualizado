'use strict';

const assertContract = require('../core/assertContract');

const METHODS = ['findByUsername', 'findByEmail', 'create'];

class IUserRepository {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IUserRepository');
  }
}

module.exports = IUserRepository;