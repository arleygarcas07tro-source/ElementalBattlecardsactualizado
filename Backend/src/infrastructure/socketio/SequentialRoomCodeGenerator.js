'use strict';

const IRoomCodeGenerator = require('../../domain/contracts/IRoomCodeGenerator');

class SequentialRoomCodeGenerator extends IRoomCodeGenerator {
  constructor(start = 1) {
    super();
    this.counter = start;
  }

  generate() {
    const code = String(this.counter).padStart(6, '0');
    this.counter = (this.counter % 999999) + 1;
    return code;
  }
}

module.exports = SequentialRoomCodeGenerator;