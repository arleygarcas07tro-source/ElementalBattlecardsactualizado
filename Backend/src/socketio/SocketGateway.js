'use strict';

const assertContract = require('../core/assertContract');

class SocketGateway {
  constructor({ io, roomManager, logger }) {
    if (!io) {
      throw new TypeError('[SocketGateway] Falta la instancia de socket.io.');
    }
    assertContract(roomManager, [
      'createRoom',
      'exists',
      'joinRoom',
      'hostId',
      'guestId',
      'toggleTurn',
      'removePlayer',
      'activeRooms',
    ], 'RoomManager');
    assertContract(logger, ['info', 'warn', 'error'], 'Logger');

    this.io = io;
    this.roomManager = roomManager;
    this.logger = logger;
  }

  registerHandlers() {
    this.io.on('connection', (socket) => {
      this.logger.info('Socket conectado:', socket.id, 'desde', socket.handshake.address);

      socket.on('create_room', (cb) => this.handleCreateRoom(socket, cb));
      socket.on('join_room', (data, cb) => this.handleJoinRoom(socket, data, cb));
      socket.on('game_event', (payload) => this.handleGameEvent(socket, payload));
      socket.on('end_turn', (payload) => this.handleEndTurn(socket, payload));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  handleCreateRoom(socket, cb) {
    const { code, role } = this.roomManager.createRoom(socket.id);

    socket.join(code);
    socket.roomCode = code;
    socket.playerRole = role;

    this.logger.info(`✅ Sala creada ${code} por ${socket.id} (host)`);
    this.logger.info(`📊 Total de salas activas: ${Object.keys(this.roomManager.activeRooms()).length}`);

    if (typeof cb === 'function') {
      cb({ success: true, code, role });
    }
    this.io.to(code).emit('room_created', { code });
  }

  handleJoinRoom(socket, data, cb) {
    const code = data && data.code ? data.code.toString().replace(/\s+/g, '') : null;

    this.logger.info(`Intento de unirse a sala. Código recibido: "${data && data.code}", Código limpio: "${code}"`);
    this.logger.info('Salas disponibles:', Object.keys(this.roomManager.activeRooms()));

    if (!code || !this.roomManager.exists(code)) {
      this.logger.info(`Sala ${code} no encontrada. Salas existentes:`, Object.keys(this.roomManager.activeRooms()));
      if (typeof cb === 'function') {
        cb({ success: false, message: 'Sala no encontrada.' });
      }
      return;
    }

    const result = this.roomManager.joinRoom(code, socket.id);
    if (!result.success) {
      if (typeof cb === 'function') {
        cb({ success: false, message: result.message });
      }
      return;
    }

    socket.join(code);
    socket.roomCode = code;
    socket.playerRole = result.role;

    this.logger.info(`${socket.id} se unió a la sala ${code} (guest)`);
    if (typeof cb === 'function') {
      cb({ success: true, code, role: result.role });
    }

    this.io.to(code).emit('player_joined', {
      players: result.room.players.length,
      canStart: result.canStart,
    });

    if (result.canStart) {
      this.io.to(code).emit('game_start', {
        currentTurn: 'host',
        hostId: this.roomManager.hostId(result.room),
        guestId: this.roomManager.guestId(result.room),
      });
    }
  }

  handleGameEvent(socket, payload) {
    const code = socket.roomCode;
    if (!code || !this.roomManager.exists(code)) {
      return;
    }

    socket.to(code).emit('game_event', payload);
    this.logger.info(`Evento ${payload.type} reenviado en sala ${code}`);
  }

  handleEndTurn(socket, payload) {
    const code = socket.roomCode;
    if (!code || !this.roomManager.exists(code)) {
      return;
    }

    const turn = this.roomManager.toggleTurn(code, socket.playerRole);
    if (!turn) {
      return;
    }

    this.io.to(code).emit('turn_changed', {
      currentTurn: turn.currentTurn,
      turnNumber: turn.turnNumber,
    });
    this.logger.info(`Turno cambiado en sala ${code}: ahora es turno de ${turn.currentTurn}`);
  }

  handleDisconnect(socket) {
    const code = socket.roomCode;
    this.logger.info('Socket desconectado:', socket.id, 'sala:', code);
    if (!code) {
      return;
    }

    const result = this.roomManager.removePlayer(code, socket.id);
    if (!result) {
      return;
    }

    if (result.empty) {
      this.logger.info(`Sala ${code} eliminada (vacía)`);
    } else {
      this.io.to(code).emit('player_left');
    }
  }
}

module.exports = SocketGateway;