'use strict';

const JoinRoomRequest = require('./dto/JoinRoomRequest');

class RoomLifecycleController {
  constructor({ io, roomService, logger }) {
    this.io = io;
    this.roomService = roomService;
    this.logger = logger;
  }

  createRoom(socket, cb) {
    const { code, role } = this.roomService.createRoom(socket.id);

    socket.join(code);
    socket.roomCode = code;
    socket.playerRole = role;

    this.logger.info(`✅ Sala creada ${code} por ${socket.id} (host)`);
    this.logger.info(`📊 Total de salas activas: ${Object.keys(this.roomService.activeRooms()).length}`);

    if (typeof cb === 'function') {
      cb({ success: true, code, role });
    }
    this.io.to(code).emit('room_created', { code });
  }

  joinRoom(socket, data, cb) {
    const request = JoinRoomRequest.fromPayload(data);
    const code = request.code;

    this.logger.info(`Intento de unirse a sala. Código recibido: "${data && data.code}", Código limpio: "${code}"`);
    this.logger.info('Salas disponibles:', Object.keys(this.roomService.activeRooms()));

    if (!request.isValid() || !this.roomService.exists(code)) {
      this.logger.info(`Sala ${code} no encontrada. Salas existentes:`, Object.keys(this.roomService.activeRooms()));
      if (typeof cb === 'function') {
        cb({ success: false, message: 'Sala no encontrada.' });
      }
      return;
    }

    const result = this.roomService.joinRoom(code, socket.id);
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
      players: result.room.playerCount(),
      canStart: result.canStart,
    });

    if (result.canStart) {
      this.io.to(code).emit('game_start', {
        currentTurn: 'host',
        hostId: this.roomService.hostId(result.room),
        guestId: this.roomService.guestId(result.room),
      });
    }
  }

  disconnect(socket) {
    const code = socket.roomCode;
    this.logger.info('Socket desconectado:', socket.id, 'sala:', code);
    if (!code) {
      return;
    }

    const result = this.roomService.removePlayer(code, socket.id);
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

module.exports = RoomLifecycleController;