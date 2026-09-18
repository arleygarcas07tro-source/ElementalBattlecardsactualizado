'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const NetworkInfo = require('../src/utils/NetworkInfo');
const ILogger = require('../src/core/ILogger');

class RecordingLogger extends ILogger {
  constructor() {
    super();
    this.lines = [];
  }

  info(...args) {
    this.lines.push(args.join(' '));
  }

  warn() {}

  error() {}
}

test('NetworkInfo exige un logger válido', () => {
  assert.throws(() => new NetworkInfo({ logger: {} }), /extender ILogger/);
});

test('NetworkInfo.getAddresses devuelve un arreglo', () => {
  const info = new NetworkInfo({ logger: new RecordingLogger() });

  assert.ok(Array.isArray(info.getAddresses()));
});

test('NetworkInfo.display escribe por el logger y no anuncia /rooms', () => {
  const logger = new RecordingLogger();

  new NetworkInfo({ logger }).display(3001);

  const output = logger.lines.join('\n');
  assert.match(output, /SERVIDOR BACKEND INICIADO/);
  assert.match(output, /http:\/\/localhost:3001\/ping/);
  assert.doesNotMatch(output, /\/rooms/);
});
