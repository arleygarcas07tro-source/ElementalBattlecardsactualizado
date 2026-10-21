'use strict';

const IRoomStore = require('./IRoomStore');
const assertContract = require('../core/assertContract');

const ALLOWED_GAME_MODES = ['clasico', 'gemas', 'contrarreloj', 'turnos30'];
const DEFAULT_GAME_MODE = 'clasico';

class RoomManager {
  constructor({ roomStore, codeGenerator, logger }) {
    IRoomStore.assert(roomStore);
    assertContract(codeGenerator, ['generate'], 'RoomCodeGenerator');
    assertContract(logger, ['info', 'warn', 'error'], 'Logger');

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

    const room = {
      players: [{ socketId, role: 'host' }],
      gameState: {
        currentTurn: 'host',
        turnNumber: 0,
        gameMode: mode,
      },
      createdAt: Date.now(),
    };

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
    if (room.players.length >= 2) {
      return { success: false, message: 'Sala llena.' };
    }

    room.players.push({ socketId, role: 'guest' });

    const canStart = room.players.length === 2;
    return { success: true, room, role: 'guest', canStart };
  }

  hostId(room) {
    return room && room.players[0] ? room.players[0].socketId : null;
  }

  guestId(room) {
    return room && room.players[1] ? room.players[1].socketId : null;
  }

  toggleTurn(code, currentRole) {
    const room = this.roomStore.get(code);
    if (!room) {
      return null;
    }

    room.gameState.currentTurn = currentRole === 'host' ? 'guest' : 'host';
    room.gameState.turnNumber++;
    return { currentTurn: room.gameState.currentTurn, turnNumber: room.gameState.turnNumber };
  }

  removePlayer(code, socketId) {
    const room = this.roomStore.get(code);
    if (!room) {
      return null;
    }

    room.players = room.players.filter((player) => player.socketId !== socketId);

    if (room.players.length === 0) {
      this.roomStore.delete(code);
      return { empty: true };
    }

    return { empty: false };
  }

  playerCount(code) {
    const room = this.roomStore.get(code);
    return room ? room.players.length : 0;
  }

  activeRooms() {
    return this.roomStore.all();
  }
}

module.exports = RoomManager;