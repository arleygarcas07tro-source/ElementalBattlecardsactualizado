'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const Room = require('../src/domain/entities/Room');
const TurnState = require('../src/domain/entities/TurnState');
const Player = require('../src/domain/entities/Player');

test('Room: requiere code y hostSocketId', () => {
  assert.throws(() => new Room({ hostSocketId: 'h' }), /código/);
  assert.throws(() => new Room({ code: '000001' }), /host/);
});

test('Room: nace con host y turno en host', () => {
  const room = new Room({ code: '000001', hostSocketId: 'h' });

  assert.equal(room.hostId(), 'h');
  assert.equal(room.guestId(), null);
  assert.equal(room.playerCount(), 1);
  assert.equal(room.isFull(), false);
  assert.equal(room.turn.currentTurn, 'host');
});

test('Room: addPlayer respeta el límite de 2', () => {
  const room = new Room({ code: '000001', hostSocketId: 'h' });

  const first = room.addPlayer('g');
  assert.equal(first.success, true);
  assert.equal(first.canStart, true);
  assert.equal(room.isFull(), true);

  const second = room.addPlayer('g2');
  assert.equal(second.success, false);
  assert.match(second.message, /llena/);
});

test('Room: removePlayer y toggleTurn', () => {
  const room = new Room({ code: '000001', hostSocketId: 'h' });
  room.addPlayer('g');

  assert.equal(room.removePlayer('g'), true);
  assert.equal(room.removePlayer('nope'), false);

  const turn = room.toggleTurn('host');
  assert.equal(turn.currentTurn, 'guest');
  assert.equal(turn.turnNumber, 1);
});

test('Room: toJSON resume jugadores y turno', () => {
  const room = new Room({ code: '000001', hostSocketId: 'h' });

  const json = room.toJSON();
  assert.equal(json.players.length, 1);
  assert.deepEqual(json.players[0], { socketId: 'h', role: 'host' });
  assert.equal(json.gameState.currentTurn, 'host');
});

test('TurnState: valida roles de entrada y destino', () => {
  assert.throws(() => new TurnState('nope'), /inválido/);

  const turn = new TurnState();
  assert.throws(() => turn.advanceTo('x'), /inválido/);
});

test('TurnState: toggle alterna y avanza turnNumber', () => {
  const turn = new TurnState('host');

  assert.deepEqual(turn.toggle('host'), { currentTurn: 'guest', turnNumber: 1 });
  assert.deepEqual(turn.toggle('guest'), { currentTurn: 'host', turnNumber: 2 });
  assert.deepEqual(turn.toJSON(), { currentTurn: 'host', turnNumber: 2 });
});

test('Player: valida socketId y rol', () => {
  assert.throws(() => new Player('', 'host'), /socketId/);
  assert.throws(() => new Player('s', 'x'), /Rol/);

  const player = new Player('s', 'guest');
  assert.equal(player.isGuest(), true);
  assert.equal(player.isHost(), false);
});
