'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const assertContract = require('../src/core/assertContract');
const ILogger = require('../src/core/ILogger');
const IRoomStore = require('../src/domain/contracts/IRoomStore');
const IRoomCodeGenerator = require('../src/domain/contracts/IRoomCodeGenerator');

class FakeLogger extends ILogger {
  info() {}
  warn() {}
  error() {}
}

test('assertContract: exige la dependencia y sus métodos', () => {
  assert.throws(() => assertContract(null, ['a'], 'IX'), /Falta la dependencia/);
  assert.throws(() => assertContract({}, ['a'], 'IX'), /no implementa: a/);
  assert.doesNotThrow(() => assertContract({ a() {} }, ['a'], 'IX'));
});

test('ILogger.assert acepta solo implementaciones que extienden', () => {
  assert.doesNotThrow(() => ILogger.assert(new FakeLogger()));
  assert.throws(() => ILogger.assert({ info() {}, warn() {}, error() {} }), /extender ILogger/);
});

test('IRoomStore.assert valida que estén todos los métodos', () => {
  assert.throws(() => IRoomStore.assert({ get() {}, set() {}, delete() {} }), /all/);
});

test('IRoomCodeGenerator.assert valida la herencia', () => {
  assert.throws(
    () => IRoomCodeGenerator.assert({ generate() { return '1'; } }),
    /extender IRoomCodeGenerator/
  );
});
