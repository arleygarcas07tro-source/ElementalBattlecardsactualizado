'use strict';

const assertContract = require('../core/assertContract');

const METHODS = ['get', 'set', 'delete', 'all'];

class IRoomStore {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IRoomStore');
  }
}

module.exports = IRoomStore;