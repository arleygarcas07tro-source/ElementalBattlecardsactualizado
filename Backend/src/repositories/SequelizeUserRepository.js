'use strict';

class SequelizeUserRepository {
  constructor(userModel) {
    if (!userModel) {
      throw new TypeError('[SequelizeUserRepository] Falta el modelo User.');
    }
    this.userModel = userModel;
  }

  async findByUsername(username) {
    return this.userModel.findOne({ where: { username } });
  }

  async findByEmail(email) {
    return this.userModel.findOne({ where: { email } });
  }

  async create({ username, email, password }) {
    return this.userModel.create({ username, email, password });
  }
}

module.exports = SequelizeUserRepository;