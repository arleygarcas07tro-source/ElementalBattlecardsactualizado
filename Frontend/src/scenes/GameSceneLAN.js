import Phaser from 'phaser';

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
    // Modo de juego: viene del evento game_start (o directo desde el host).
    this.gameMode = (data.gameMode) || (this.gameStartData && this.gameStartData.gameMode) || 'clasico';
  }

  create() {
    // Determinar backend URL por si el socket no fue pasado
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    let SERVER_URL = null;
    if (params.has('backend')) {
      SERVER_URL = params.get('backend');
    } else if (typeof window !== 'undefined' && window.BACKEND_URL) {
      SERVER_URL = window.BACKEND_URL;
    } else if (typeof window !== 'undefined') {
      SERVER_URL = `http://${location.hostname}:3001`;
    } else {
      SERVER_URL = 'http://localhost:3001';
    }

    if (!this.socket) {
      // crear socket si no se pasó desde la escena anterior
      // cargamos dinámicamente para evitar cargarlo si no es necesario
      try {
        const { io } = require('socket.io-client');
        this.socket = io(SERVER_URL);
      } catch (e) {
        console.error('No se pudo inicializar socket.io-client en GameSceneLAN', e);
        this.scene.start('GameScene', { playerData: this.playerData });
        return;
      }
    }

    // Asegurar que estamos en la sala
    if (this.roomCode) {
      // intentar unirse si no estamos en la sala ya
      this.socket.emit('join_room', { code: this.roomCode }, (res) => {
        if (!res || !res.success) {
          console.warn('No se pudo unir a la sala desde GameSceneLAN:', res && res.message);
        }
        // lanzamos la escena de juego principal y le pasamos el socket, roomCode y rol
        this.scene.start('GameScene', { 
          playerData: this.playerData, 
          roomCode: this.roomCode, 
          socket: this.socket, 
          isLAN: true,
          playerRole: this.playerRole,
          gameMode: this.gameMode,
          gameStartData: this.gameStartData
        });
      });
    } else {
      // Si no hay código, simplemente arrancar GameScene en modo LAN (sin room)
      this.scene.start('GameScene', { 
        playerData: this.playerData, 
        roomCode: null, 
        socket: this.socket, 
        isLAN: true,
        playerRole: this.playerRole,
        gameMode: this.gameMode
      });
    }
  }
}
