'use strict';

const IRoomStore = require('../../domain/contracts/IRoomStore');

class InMemoryRoomStore extends IRoomStore {
  constructor() {
    super();
    this.rooms = {};
  }

  get(code) {
    return this.rooms[code] || null;
  }

  set(code, room) {
    this.rooms[code] = room;
    return room;
  }

  delete(code) {
    return delete this.rooms[code];
  }

  all() {
    return this.rooms;
  }
}

module.exports = InMemoryRoomStore;