'use strict';

const bcrypt = require('bcryptjs');
const IPasswordHasher = require('../../domain/contracts/IPasswordHasher');

class BcryptPasswordHasher extends IPasswordHasher {
  constructor(saltRounds = 10) {
    super();
    this.saltRounds = saltRounds;
  }

  async hash(password) {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }
}

module.exports = BcryptPasswordHasher;