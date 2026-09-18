'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const JoinRoomRequest = require('../src/presentation/socket/dto/JoinRoomRequest');
const GameEventRequest = require('../src/presentation/socket/dto/GameEventRequest');

test('JoinRoomRequest: normaliza el código y detecta su ausencia', () => {
  assert.equal(JoinRoomRequest.fromPayload({ code: ' 000123 ' }).code, '000123');
  assert.equal(JoinRoomRequest.fromPayload({}).hasCode(), false);
  assert.equal(JoinRoomRequest.fromPayload(null).code, null);
});

test('JoinRoomRequest: isValid exige exactamente 6 dígitos', () => {
  assert.equal(JoinRoomRequest.fromPayload({ code: '000123' }).isValid(), true);
  assert.equal(JoinRoomRequest.fromPayload({ code: 'abc' }).isValid(), false);
  assert.equal(JoinRoomRequest.fromPayload({ code: '12345' }).isValid(), false);
  assert.equal(JoinRoomRequest.fromPayload({ code: 123456 }).isValid(), true);
});

test('GameEventRequest: acepta tipos permitidos con índices en rango', () => {
  assert.equal(GameEventRequest.fromPayload({ type: 'play_card', fieldIndex: 0 }).isValid(), true);
  assert.equal(GameEventRequest.fromPayload({ type: 'fuse_cards', sourceIndex: 0, targetIndex: 5 }).isValid(), true);
  assert.equal(GameEventRequest.fromPayload({ type: 'fuse_from_hand', targetIndex: 2 }).isValid(), true);
  assert.equal(GameEventRequest.fromPayload({ type: 'attack', attackerIndex: 1, defenderIndex: 2 }).isValid(), true);
  assert.equal(GameEventRequest.fromPayload({ type: 'direct_attack', attackerIndex: 3 }).isValid(), true);
});

test('GameEventRequest: rechaza payload vacío o tipo desconocido', () => {
  assert.equal(GameEventRequest.fromPayload(null).isValid(), false);
  assert.equal(GameEventRequest.fromPayload({}).isValid(), false);
  assert.equal(GameEventRequest.fromPayload({ type: 'hack' }).isValid(), false);
});

test('GameEventRequest: rechaza índices fuera de rango o no enteros', () => {
  assert.equal(GameEventRequest.fromPayload({ type: 'play_card', fieldIndex: 6 }).isValid(), false);
  assert.equal(GameEventRequest.fromPayload({ type: 'play_card', fieldIndex: -1 }).isValid(), false);
  assert.equal(GameEventRequest.fromPayload({ type: 'play_card', fieldIndex: '0' }).isValid(), false);
  assert.equal(GameEventRequest.fromPayload({ type: 'attack', attackerIndex: 0 }).isValid(), false);
});
