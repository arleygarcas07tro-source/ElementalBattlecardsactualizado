'use strict';

const assertContract = require('../../core/assertContract');

const METHODS = [
  'createRoom',
  'getRoom',
  'exists',
  'joinRoom',
  'hostId',
  'guestId',
  'toggleTurn',
  'removePlayer',
  'playerCount',
  'activeRooms',
];

class IRoomService {
  static get METHODS() {
    return METHODS;
  }

  static assert(implementation) {
    assertContract(implementation, METHODS, 'IRoomService', IRoomService);
  }

  createRoom() {
    throw new Error('[IRoomService] Método abstracto createRoom() no implementado.');
  }

  getRoom() {
    throw new Error('[IRoomService] Método abstracto getRoom() no implementado.');
  }

  exists() {
    throw new Error('[IRoomService] Método abstracto exists() no implementado.');
  }

  joinRoom() {
    throw new Error('[IRoomService] Método abstracto joinRoom() no implementado.');
  }

  hostId() {
    throw new Error('[IRoomService] Método abstracto hostId() no implementado.');
  }

  guestId() {
    throw new Error('[IRoomService] Método abstracto guestId() no implementado.');
  }

  toggleTurn() {
    throw new Error('[IRoomService] Método abstracto toggleTurn() no implementado.');
  }

  removePlayer() {
    throw new Error('[IRoomService] Método abstracto removePlayer() no implementado.');
  }

  playerCount() {
    throw new Error('[IRoomService] Método abstracto playerCount() no implementado.');
  }

  activeRooms() {
    throw new Error('[IRoomService] Método abstracto activeRooms() no implementado.');
  }
}

module.exports = IRoomService;