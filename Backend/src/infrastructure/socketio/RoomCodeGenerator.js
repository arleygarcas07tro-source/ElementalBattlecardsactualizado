'use strict';

const IRoomCodeGenerator = require('../../domain/contracts/IRoomCodeGenerator');

class RoomCodeGenerator extends IRoomCodeGenerator {
  generate() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = RoomCodeGenerator;