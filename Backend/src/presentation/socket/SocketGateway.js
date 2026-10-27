'use strict';

const ILogger = require('../../core/ILogger');
const IRoomService = require('../../domain/contracts/IRoomService');
const RoomLifecycleController = require('./RoomLifecycleController');
const GameplayController = require('./GameplayController');

class SocketGateway {
  constructor({ io, roomService, logger }) {
    if (!io) {
      throw new TypeError('[SocketGateway] Falta la instancia de socket.io.');
    }
    IRoomService.assert(roomService);
    ILogger.assert(logger);

    this.io = io;
    this.roomService = roomService;
    this.logger = logger;
    this.roomLifecycle = new RoomLifecycleController({ io, roomService, logger });
    this.gameplay = new GameplayController({ io, roomService, logger });
  }

  registerHandlers() {
    this.io.on('connection', (socket) => {
      this.logger.info('Socket conectado:', socket.id, 'desde', socket.handshake.address);

      socket.on('create_room', this.guard('create_room', (data, cb) => this.roomLifecycle.createRoom(socket, data, cb)));
      socket.on('join_room', this.guard('join_room', (data, cb) => this.roomLifecycle.joinRoom(socket, data, cb)));
      socket.on('start_game', this.guard('start_game', (data, cb) => this.roomLifecycle.startGame(socket, data, cb)));
      socket.on('game_event', this.guard('game_event', (payload) => this.gameplay.gameEvent(socket, payload)));
      socket.on('end_turn', this.guard('end_turn', () => this.gameplay.endTurn(socket)));
      socket.on('disconnect', this.guard('disconnect', () => this.roomLifecycle.disconnect(socket)));
    });
  }

  /**
   * Envuelve un handler para que un error inesperado no tumbe el proceso y,
   * si el último argumento es un callback del cliente, reciba una respuesta.
   * @param {string} name Nombre del evento (para logs).
   * @param {Function} handler
   * @returns {Function}
   */
  guard(name, handler) {
    return (...args) => {
      try {
        return handler(...args);
      } catch (error) {
        this.logger.error(`[SocketGateway] Error en "${name}":`, error);
        const cb = args[args.length - 1];
        if (typeof cb === 'function') {
          cb({ success: false, message: 'Error en el servidor.' });
        }
        return undefined;
      }
    };
  }
}

module.exports = SocketGateway;