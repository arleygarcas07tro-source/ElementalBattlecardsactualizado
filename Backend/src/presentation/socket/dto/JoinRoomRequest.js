'use strict';

const CODE_LENGTH = 6;
const CODE_PATTERN = /^\d{6}$/;

/**
 * DTO de entrada para `join_room`. Normaliza el código (quita espacios) y
 * expone validación tipada del formato esperado (6 dígitos).
 */
class JoinRoomRequest {
  constructor({ code }) {
    this.code = JoinRoomRequest.normalize(code);
  }

  static normalize(code) {
    if (code === null || code === undefined) {
      return null;
    }
    return code.toString().replace(/\s+/g, '');
  }

  static fromPayload(data) {
    return new JoinRoomRequest({ code: data && data.code });
  }

  hasCode() {
    return Boolean(this.code);
  }

  isValid() {
    return CODE_PATTERN.test(this.code || '');
  }

  static get CODE_LENGTH() {
    return CODE_LENGTH;
  }
}

module.exports = JoinRoomRequest;
