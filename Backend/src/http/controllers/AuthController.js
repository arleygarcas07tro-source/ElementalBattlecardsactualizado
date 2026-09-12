'use strict';

const assertContract = require('../../core/assertContract');

class AuthController {
  constructor(authService) {
    assertContract(authService, ['register', 'login'], 'AuthService');
    this.authService = authService;
  }

  async register(req, res, next) {
    try {
      await this.authService.register(req.body || {});
      res.status(201).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await this.authService.login(req.body || {});
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;