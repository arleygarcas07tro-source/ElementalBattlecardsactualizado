'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const RoomService = require('../src/domain/services/RoomService');
const InMemoryRoomStore = require('../src/infrastructure/socketio/InMemoryRoomStore');
const RoomCodeGenerator = require('../src/infrastructure/socketio/RoomCodeGenerator');
const SequentialRoomCodeGenerator = require('../src/infrastructure/socketio/SequentialRoomCodeGenerator');
const ILogger = require('../src/core/ILogger');

class QuietLogger extends ILogger {
  info() {}
  warn() {}
  error() {}
}

function makeService(codeGenerator = new SequentialRoomCodeGenerator()) {
  return new RoomService({
    roomStore: new InMemoryRoomStore(),
    codeGenerator,
    logger: new QuietLogger(),
  });
}

test('RoomService.createRoom crea un host con código válido', () => {
  const service = makeService();

  const created = service.createRoom('h');

  assert.equal(created.role, 'host');
  assert.match(created.code, /^\d{6}$/);
  assert.equal(service.exists(created.code), true);
});

test('RoomService.createRoom evita colisiones sobre el store', () => {
  const service = makeService();

  const a = service.createRoom('h1');
  const b = service.createRoom('h2');

  assert.equal(a.code, '000001');
  assert.equal(b.code, '000002');
});

test('RoomService.joinRoom llena la sala y reporta canStart', () => {
  const service = makeService();
  const { code } = service.createRoom('h');

  const joined = service.joinRoom(code, 'g');
  assert.equal(joined.success, true);
  assert.equal(joined.role, 'guest');
  assert.equal(joined.canStart, true);

  const third = service.joinRoom(code, 'g2');
  assert.equal(third.success, false);
  assert.match(third.message, /llena/);
});

test('RoomService.joinRoom falla si la sala no existe', () => {
  const service = makeService();

  const result = service.joinRoom('999999', 'g');

  assert.equal(result.success, false);
  assert.match(result.message, /no encontrada/i);
});

test('RoomService.toggleTurn alterna y acumula turnNumber', () => {
  const service = makeService();
  const { code } = service.createRoom('h');

  const first = service.toggleTurn(code, 'host');
  const second = service.toggleTurn(code, 'guest');

  assert.equal(first.currentTurn, 'guest');
  assert.equal(second.currentTurn, 'host');
  assert.equal(second.turnNumber, 2);
});

test('RoomService.toggleTurn en sala inexistente devuelve null', () => {
  assert.equal(makeService().toggleTurn('999999', 'host'), null);
});

test('RoomService.removePlayer elimina la sala al quedar vacía', () => {
  const service = makeService();
  const { code } = service.createRoom('h');
  service.joinRoom(code, 'g');

  assert.deepEqual(service.removePlayer(code, 'g'), { empty: false });
  assert.deepEqual(service.removePlayer(code, 'h'), { empty: true });
  assert.equal(service.exists(code), false);
});

test('RoomService expone consultas de sala y activeRooms', () => {
  const service = makeService();
  const { code } = service.createRoom('h');
  service.joinRoom(code, 'g');

  assert.equal(service.playerCount(code), 2);
  assert.equal(service.hostId(service.getRoom(code)), 'h');
  assert.equal(service.guestId(service.getRoom(code)), 'g');
  assert.equal(Object.keys(service.activeRooms()).length, 1);
  assert.equal(service.playerCount('999999'), 0);
});

test('SequentialRoomCodeGenerator respeta el invariante de 6 dígitos en el borde', () => {
  const generator = new SequentialRoomCodeGenerator(999999);

  const first = generator.generate();
  const second = generator.generate();

  assert.equal(first, '999999');
  assert.equal(second, '000001');
  assert.match(first, /^\d{6}$/);
  assert.match(second, /^\d{6}$/);
});

test('RoomService funciona con el generador aleatorio', () => {
  const service = makeService(new RoomCodeGenerator());

  const { code } = service.createRoom('h');

  assert.match(code, /^\d{6}$/);
});
