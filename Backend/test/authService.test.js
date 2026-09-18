'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const AuthService = require('../src/domain/services/AuthService');
const ILogger = require('../src/core/ILogger');
const { ValidationError, UnauthorizedError, ConflictError } = require('../src/core/errors');

class QuietLogger extends ILogger {
  info() {}
  warn() {}
  error() {}
}

function makeDeps() {
  const users = [];
  const userRepository = {
    _users: users,
    async findByUsername(username) {
      return users.find((u) => u.username === username) || null;
    },
    async findByEmail(email) {
      return users.find((u) => u.email === email) || null;
    },
    async create(data) {
      const user = { id: users.length + 1, ...data };
      users.push(user);
      return user;
    },
  };
  const passwordHasher = {
    async hash(plain) {
      return `hashed:${plain}`;
    },
    async compare(plain, hashed) {
      return `hashed:${plain}` === hashed;
    },
  };
  const tokenService = {
    async sign(payload) {
      return `token:${payload.user.id}`;
    },
    async verify() {
      return {};
    },
  };
  return { userRepository, passwordHasher, tokenService };
}

function makeService(deps = makeDeps()) {
  return new AuthService({ ...deps, logger: new QuietLogger() });
}

test('AuthService.register exige todos los campos', async () => {
  const service = makeService();

  await assert.rejects(() => service.register({ username: 'a' }), ValidationError);
});

test('AuthService.register rechaza email duplicado', async () => {
  const deps = makeDeps();
  await deps.userRepository.create({ username: 'a', email: 'a@a.com', password: 'hashed:x' });
  const service = makeService(deps);

  await assert.rejects(
    () => service.register({ username: 'b', email: 'a@a.com', password: 'x' }),
    ConflictError
  );
});

test('AuthService.register hashea y crea el usuario', async () => {
  const service = makeService();

  const user = await service.register({ username: 'a', email: 'a@a.com', password: 'secret' });

  assert.equal(user.password, 'hashed:secret');
  assert.equal(user.id, 1);
});

test('AuthService.login exige todos los campos', async () => {
  const service = makeService();

  await assert.rejects(() => service.login({ username: 'a' }), ValidationError);
});

test('AuthService.login rechaza usuario inexistente', async () => {
  const service = makeService();

  await assert.rejects(() => service.login({ username: 'nope', password: 'x' }), UnauthorizedError);
});

test('AuthService.login rechaza password incorrecta', async () => {
  const deps = makeDeps();
  await deps.userRepository.create({ username: 'a', email: 'a@a.com', password: 'hashed:secret' });
  const service = makeService(deps);

  await assert.rejects(() => service.login({ username: 'a', password: 'wrong' }), UnauthorizedError);
});

test('AuthService.login devuelve token y usuario sin password', async () => {
  const deps = makeDeps();
  await deps.userRepository.create({ username: 'a', email: 'a@a.com', password: 'hashed:secret' });
  const service = makeService(deps);

  const result = await service.login({ username: 'a', password: 'secret' });

  assert.equal(result.token, 'token:1');
  assert.deepEqual(result.user, { id: 1, username: 'a', email: 'a@a.com' });
  assert.equal(result.user.password, undefined);
});
