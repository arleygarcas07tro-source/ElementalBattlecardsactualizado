'use strict';

const VALID_ROLES = ['host', 'guest'];

class Player {
  #socketId;
  #role;

  constructor(socketId, role) {
    if (!socketId) {
      throw new TypeError('[Player] Falta socketId.');
    }
    if (!VALID_ROLES.includes(role)) {
      throw new TypeError(`[Player] Rol inválido: ${role}`);
    }
    this.#socketId = socketId;
    this.#role = role;
  }

  get socketId() {
    return this.#socketId;
  }

  get role() {
    return this.#role;
  }

  isHost() {
    return this.#role === 'host';
  }

  isGuest() {
    return this.#role === 'guest';
  }
}

module.exports = Player;