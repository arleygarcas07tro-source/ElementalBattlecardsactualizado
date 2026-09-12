'use strict';

const jwt = require('jsonwebtoken');

class JwtTokenService {
  constructor(secret, options = {}) {
    if (!secret) {
      throw new TypeError('[JwtTokenService] Falta el secreto JWT.');
    }
    this.secret = secret;
    this.expiresIn = options.expiresIn || '1h';
  }

  sign(payload) {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, this.secret, { expiresIn: this.expiresIn }, (error, token) => {
        if (error) {
          return reject(error);
        }
        return resolve(token);
      });
    });
  }

  verify(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.secret, (error, decoded) => {
        if (error) {
          return reject(error);
        }
        return resolve(decoded);
      });
    });
  }
}

module.exports = JwtTokenService;