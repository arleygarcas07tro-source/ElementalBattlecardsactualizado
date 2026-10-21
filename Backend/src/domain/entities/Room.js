'use strict';

const Player = require('./Player');
const TurnState = require('./TurnState');

class Room {
  #code;
  #players;
  #turn;
  #gameMode;
  #createdAt;

  constructor({ code, hostSocketId, createdAt = Date.now(), gameMode = 'clasico' }) {
    if (!code) {
      throw new TypeError('[Room] Falta el código de la sala.');
    }
    if (!hostSocketId) {
      throw new TypeError('[Room] Falta el socketId del host.');
    }
    this.#code = code;
    this.#players = [new Player(hostSocketId, 'host')];
    this.#turn = new TurnState('host');
    this.#gameMode = gameMode;
    this.#createdAt = createdAt;
  }

  get code() {
    return this.#code;
  }

  get turn() {
    return this.#turn;
  }

  get gameMode() {
    return this.#gameMode;
  }

  isEmpty() {
    return this.#players.length === 0;
  }

  isFull() {
    return this.#players.length >= 2;
  }

  canStart() {
    return this.#players.length === 2;
  }

  playerCount() {
    return this.#players.length;
  }

  hostId() {
    const host = this.#players.find((player) => player.isHost());
    return host ? host.socketId : null;
  }

  guestId() {
    const guest = this.#players.find((player) => player.isGuest());
    return guest ? guest.socketId : null;
  }

  addPlayer(socketId) {
    if (this.isFull()) {
      return { success: false, message: 'Sala llena.' };
    }
    const player = new Player(socketId, 'guest');
    this.#players.push(player);
    return { success: true, role: player.role, canStart: this.canStart() };
  }

  removePlayer(socketId) {
    const before = this.#players.length;
    this.#players = this.#players.filter((player) => player.socketId !== socketId);
    return this.#players.length < before;
  }

  toggleTurn(fromRole) {
    return this.#turn.toggle(fromRole);
  }

  toJSON() {
    return {
      players: this.#players.map((player) => ({ socketId: player.socketId, role: player.role })),
      gameState: { ...this.#turn.toJSON(), gameMode: this.#gameMode },
      createdAt: this.#createdAt,
    };
  }
}

module.exports = Room;