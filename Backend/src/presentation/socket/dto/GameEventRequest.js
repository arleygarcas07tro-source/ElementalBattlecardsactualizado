'use strict';

const FIELD_SIZE = 6;

const ALLOWED_TYPES = [
  'play_card',
  'fuse_cards',
  'fuse_from_hand',
  'attack',
  'direct_attack',
  'game_over',
];

/**
 * DTO de entrada para `game_event`. Valida el tipo de evento y los índices de
 * campo que transporta, de modo que la capa de presentación rechace payloads
 * malformados antes de reenviarlos al rival.
 */
class GameEventRequest {
  constructor(payload) {
    this.payload = payload && typeof payload === 'object' ? payload : null;
  }

  static fromPayload(payload) {
    return new GameEventRequest(payload);
  }

  get type() {
    return this.payload ? this.payload.type : null;
  }

  isAllowedType() {
    return ALLOWED_TYPES.includes(this.type);
  }

  /**
   * @returns {boolean} `true` si el payload tiene un tipo permitido y todos
   *   los índices de campo requeridos son enteros dentro de rango.
   */
  isValid() {
    if (!this.payload || !this.isAllowedType()) {
      return false;
    }

    const validIndex = (value) => Number.isInteger(value) && value >= 0 && value < FIELD_SIZE;
    const p = this.payload;

    switch (this.type) {
      case 'play_card':
        return validIndex(p.fieldIndex);
      case 'fuse_cards':
        return validIndex(p.sourceIndex) && validIndex(p.targetIndex);
      case 'fuse_from_hand':
        return validIndex(p.targetIndex);
      case 'attack':
        return validIndex(p.attackerIndex) && validIndex(p.defenderIndex);
      case 'direct_attack':
        return validIndex(p.attackerIndex);
      case 'game_over': {
        const validWinner = p.winner === null || p.winner === 'player' || p.winner === 'opponent';
        const validReason = p.reason === null || p.reason === undefined || typeof p.reason === 'string';
        return validWinner && validReason;
      }
      default:
        return false;
    }
  }

  static get ALLOWED_TYPES() {
    return ALLOWED_TYPES;
  }
}

module.exports = GameEventRequest;
