'use strict';

const IRoomService = require('../contracts/IRoomService');
const IRoomCodeGenerator = require('../contracts/IRoomCodeGenerator');
const IRoomStore = require('../contracts/IRoomStore');
const ILogger = require('../../core/ILogger');
const Room = require('../entities/Room');

const ALLOWED_GAME_MODES = ['clasico', 'gemas', 'contrarreloj', 'turnos30'];
const DEFAULT_GAME_MODE = 'clasico';

class RoomService extends IRoomService {
  constructor({ roomStore, codeGenerator, logger }) {
    super();
    IRoomStore.assert(roomStore);
    IRoomCodeGenerator.assert(codeGenerator);
    ILogger.assert(logger);

    this.roomStore = roomStore;
    this.codeGenerator = codeGenerator;
    this.logger = logger;
  }

  createRoom(socketId, gameMode = DEFAULT_GAME_MODE) {
    let code;
    do {
      code = this.codeGenerator.generate();
    } while (this.roomStore.get(code));

    const mode = ALLOWED_GAME_MODES.includes(gameMode) ? gameMode : DEFAULT_GAME_MODE;
    const room = new Room({ code, hostSocketId: socketId, gameMode: mode });
    this.roomStore.set(code, room);
    return { code, room, role: 'host', gameMode: mode };
  }

  getRoom(code) {
    return this.roomStore.get(code);
  }

  exists(code) {
    return Boolean(this.roomStore.get(code));
  }

  joinRoom(code, socketId) {
    const room = this.roomStore.get(code);
    if (!room) {
      return { success: false, message: 'Sala no encontrada.' };
    }

    const result = room.addPlayer(socketId);
    if (!result.success) {
      return { success: false, message: result.message };
    }

    return { success: true, room, role: result.role, canStart: result.canStart };
  }

  hostId(room) {
    return room ? room.hostId() : null;
  }

  guestId(room) {
    return room ? room.guestId() : null;
  }

  toggleTurn(code, currentRole) {
    const room = this.roomStore.get(code);
    if (!room) {
      return null;
    }
    return room.toggleTurn(currentRole);
  }

  removePlayer(code, socketId) {
    const room = this.roomStore.get(code);
    if (!room) {
      return null;
    }

    room.removePlayer(socketId);

    if (room.isEmpty()) {
      this.roomStore.delete(code);
      return { empty: true };
    }
    return { empty: false };
  }

  playerCount(code) {
    const room = this.roomStore.get(code);
    return room ? room.playerCount() : 0;
  }

  activeRooms() {
    return this.roomStore.all();
  }
}

module.exports = RoomService;
