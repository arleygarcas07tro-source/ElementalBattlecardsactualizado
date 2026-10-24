'use strict';

const GameEventRequest = require('./dto/GameEventRequest');

class GameplayController {
  constructor({ io, roomService, logger }) {
    this.io = io;
    this.roomService = roomService;
    this.logger = logger;
  }

  gameEvent(socket, payload) {
    const code = socket.roomCode;
    if (!code || !this.roomService.exists(code)) {
      return;
    }

    if (this.roomService.playerCount(code) < 2) {
      this.logger.warn(`[SocketGateway] game_event ignorado: la sala ${code} no está completa.`);
      return;
    }

    const request = GameEventRequest.fromPayload(payload);
    if (!request.isValid()) {
      this.logger.warn(`[SocketGateway] game_event inválido en sala ${code}:`, payload && payload.type);
      return;
    }

    socket.to(code).emit('game_event', payload);
    this.logger.info(`Evento ${request.type} reenviado en sala ${code}`);
  }

  endTurn(socket) {
    const code = socket.roomCode;
    if (!code || !this.roomService.exists(code)) {
      return;
    }

    const turn = this.roomService.toggleTurn(code, socket.playerRole);
    if (!turn) {
      return;
    }

    this.io.to(code).emit('turn_changed', {
      currentTurn: turn.currentTurn,
      turnNumber: turn.turnNumber,
      turnStartedAt: Date.now(),
    });
    this.logger.info(`Turno cambiado en sala ${code}: ahora es turno de ${turn.currentTurn}`);
  }
}

module.exports = GameplayController;