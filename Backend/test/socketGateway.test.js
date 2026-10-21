'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const SocketGateway = require('../src/presentation/socket/SocketGateway');
const RoomService = require('../src/domain/services/RoomService');
const InMemoryRoomStore = require('../src/infrastructure/socketio/InMemoryRoomStore');
const SequentialRoomCodeGenerator = require('../src/infrastructure/socketio/SequentialRoomCodeGenerator');
const ILogger = require('../src/core/ILogger');

class QuietLogger extends ILogger {
  info() {}
  warn() {}
  error() {}
}

function makeFakeIo() {
  const connectionHandlers = [];
  const emitted = [];
  return {
    emitted,
    on(event, handler) {
      if (event === 'connection') connectionHandlers.push(handler);
    },
    to(room) {
      return { emit: (event, payload) => emitted.push({ room, event, payload }) };
    },
    connect(socket) {
      connectionHandlers.forEach((handler) => handler(socket));
    },
  };
}

function makeFakeSocket(id) {
  const socket = {
    id,
    handshake: { address: '127.0.0.1' },
    _handlers: {},
    _joined: [],
    _emitted: [],
    on(event, handler) {
      socket._handlers[event] = handler;
    },
    join(code) {
      socket._joined.push(code);
    },
    to(room) {
      return { emit: (event, payload) => socket._emitted.push({ room, event, payload }) };
    },
  };
  return socket;
}

function makeGateway() {
  const io = makeFakeIo();
  const roomService = new RoomService({
    roomStore: new InMemoryRoomStore(),
    codeGenerator: new SequentialRoomCodeGenerator(),
    logger: new QuietLogger(),
  });
  const gateway = new SocketGateway({ io, roomService, logger: new QuietLogger() });
  gateway.registerHandlers();
  return { io, roomService, gateway };
}

function connectPair(io) {
  const host = makeFakeSocket('host');
  const guest = makeFakeSocket('guest');
  io.connect(host);
  io.connect(guest);
  let code = null;
  host._handlers.create_room((response) => { code = response.code; });
  guest._handlers.join_room({ code }, () => {});
  return { host, guest, code };
}

test('SocketGateway: valida sus dependencias al construirse', () => {
  assert.throws(() => new SocketGateway({ roomService: {}, logger: new QuietLogger() }), /socket.io/);
});

test('SocketGateway.handleCreateRoom crea la sala y responde al host', () => {
  const { io, roomService } = makeGateway();
  const socket = makeFakeSocket('host');
  io.connect(socket);

  let response = null;
  socket._handlers.create_room((r) => { response = r; });

  assert.equal(response.success, true);
  assert.equal(response.role, 'host');
  assert.match(response.code, /^\d{6}$/);
  assert.deepEqual(socket._joined, [response.code]);
  assert.equal(socket.roomCode, response.code);
  assert.equal(socket.playerRole, 'host');
  assert.equal(roomService.exists(response.code), true);
});

test('SocketGateway.handleJoinRoom rechaza un código inválido', () => {
  const { io } = makeGateway();
  const socket = makeFakeSocket('guest');
  io.connect(socket);

  let response = null;
  socket._handlers.join_room({ code: 'abc' }, (r) => { response = r; });

  assert.equal(response.success, false);
});

test('SocketGateway.handleJoinRoom une al guest y emite game_start', () => {
  const { io } = makeGateway();

  const { guest, code } = connectPair(io);

  assert.equal(guest.roomCode, code);
  assert.equal(guest.playerRole, 'guest');
  const events = io.emitted.map((e) => e.event);
  assert.ok(events.includes('player_joined'));
  assert.ok(events.includes('game_start'));
});

test('SocketGateway.handleGameEvent reenvía eventos válidos en sala completa', () => {
  const { io } = makeGateway();
  const { host } = connectPair(io);

  host._handlers.game_event({ type: 'play_card', fieldIndex: 0 });

  const relayed = host._emitted.filter((e) => e.event === 'game_event');
  assert.equal(relayed.length, 1);
});

test('SocketGateway.handleGameEvent ignora payloads inválidos', () => {
  const { io } = makeGateway();
  const { host } = connectPair(io);

  host._handlers.game_event({ type: 'hack', fieldIndex: 99 });

  assert.equal(host._emitted.filter((e) => e.event === 'game_event').length, 0);
});

test('SocketGateway.handleGameEvent ignora salas incompletas', () => {
  const { io } = makeGateway();
  const host = makeFakeSocket('host');
  io.connect(host);
  host._handlers.create_room(() => {});

  host._handlers.game_event({ type: 'play_card', fieldIndex: 0 });

  assert.equal(host._emitted.length, 0);
});

test('SocketGateway.handleEndTurn emite turn_changed', () => {
  const { io } = makeGateway();
  const { host } = connectPair(io);

  host._handlers.end_turn({});

  const turnChanged = io.emitted.filter((e) => e.event === 'turn_changed');
  assert.equal(turnChanged.length, 1);
  assert.equal(turnChanged[0].payload.currentTurn, 'guest');
});

test('SocketGateway.guard captura errores y responde por callback', () => {
  const { gateway } = makeGateway();
  const guarded = gateway.guard('boom', () => { throw new Error('boom'); });

  let response = null;
  guarded((r) => { response = r; });

  assert.equal(response.success, false);
  assert.match(response.message, /servidor/);
});

test('SocketGateway.handleDisconnect elimina la sala vacía', () => {
  const { io, roomService } = makeGateway();
  const host = makeFakeSocket('host');
  io.connect(host);
  let code = null;
  host._handlers.create_room((r) => { code = r.code; });

  host._handlers.disconnect();

  assert.equal(roomService.exists(code), false);
});
