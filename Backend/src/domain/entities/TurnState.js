'use strict';

const ROLES = ['host', 'guest'];

class TurnState {
  #currentTurn;
  #turnNumber;

  constructor(currentTurn = 'host', turnNumber = 0) {
    if (!ROLES.includes(currentTurn)) {
      throw new TypeError(`[TurnState] Turno inicial inválido: ${currentTurn}`);
    }
    this.#currentTurn = currentTurn;
    this.#turnNumber = turnNumber;
  }

  get currentTurn() {
    return this.#currentTurn;
  }

  get turnNumber() {
    return this.#turnNumber;
  }

  toggle(fromRole) {
    const next = fromRole === 'host' ? 'guest' : 'host';
    return this.advanceTo(next);
  }

  advanceTo(role) {
    if (!ROLES.includes(role)) {
      throw new TypeError(`[TurnState] Turno destino inválido: ${role}`);
    }
    this.#currentTurn = role;
    this.#turnNumber++;
    return { currentTurn: this.#currentTurn, turnNumber: this.#turnNumber };
  }

  toJSON() {
    return {
      currentTurn: this.#currentTurn,
      turnNumber: this.#turnNumber,
    };
  }
}

module.exports = TurnState;