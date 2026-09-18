'use strict';

const IUserRepository = require('../contracts/IUserRepository');
const IPasswordHasher = require('../contracts/IPasswordHasher');
const ITokenService = require('../contracts/ITokenService');
const ILogger = require('../../core/ILogger');
const { ValidationError, UnauthorizedError, ConflictError } = require('../../core/errors');

class AuthService {
  constructor({ userRepository, passwordHasher, tokenService, logger }) {
    IUserRepository.assert(userRepository);
    IPasswordHasher.assert(passwordHasher);
    ITokenService.assert(tokenService);
    ILogger.assert(logger);

    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
    this.logger = logger;
  }

  async register({ username, email, password }) {
    if (!username || !email || !password) {
      throw new ValidationError('Por favor, proporciona todos los campos.');
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('El correo electrónico ya está en uso.');
    }

    const hashedPassword = await this.passwordHasher.hash(password);
    const savedUser = await this.userRepository.create({ username, email, password: hashedPassword });

    this.logger.info('Usuario guardado:', savedUser.id);
    return savedUser;
  }

  async login({ username, password }) {
    if (!username || !password) {
      throw new ValidationError('Por favor, proporciona todos los campos.');
    }

    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas.');
    }

    const isMatch = await this.passwordHasher.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Credenciales inválidas.');
    }

    const payload = { user: { id: user.id, username: user.username } };
    const token = await this.tokenService.sign(payload);

    return {
      token,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }
}

module.exports = AuthService;