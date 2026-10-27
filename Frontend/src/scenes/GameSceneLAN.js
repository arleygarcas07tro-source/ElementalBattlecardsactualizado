import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { resolveBaseUrl } from '../helpers/networkConfig.js';

export default class GameSceneLAN extends Phaser.Scene {
  constructor() {
    super('GameSceneLAN');
    this.socket = null;
    this.roomCode = null;
    this.playerData = null;
  }

  init(data) {
    this.playerData = data.playerData || {};
    this.roomCode = data.roomCode || null;
    this.socket = data.socket || null;
    this.playerRole = data.playerRole || null; // 'host' o 'guest'
    this.gameStartData = data.gameStartData || null;
    // Modo de juego: viene del evento player_joined (o directo desde el host).
    this.gameMode = (data.gameMode) || (this.gameStartData && this.gameStartData.gameMode) || 'clasico';
  }

  create() {
    if (!this.socket) {
      this.socket = io(resolveBaseUrl());
    }

    // Si el host inicia mientras el guest aún carga GameScene, guardamos el
    // game_start para que no se pierda antes de que exista su listener.
    const earlyGameStart = { data: this.gameStartData || null, handler: null };
    if (this.socket) {
      earlyGameStart.handler = (payload) => {
        earlyGameStart.data = payload;
      };
      this.socket.on('game_start', earlyGameStart.handler);
    }

    this.scene.start('GameScene', {
      playerData: this.playerData,
      roomCode: this.roomCode,
      socket: this.socket,
      isLAN: true,
      playerRole: this.playerRole,
      gameMode: this.gameMode,
      gameStartData: this.gameStartData,
      earlyGameStart
    });
  }
}
