import Phaser from 'phaser';
import LoginScene from './scenes/LoginScene.js';
import RegisterScene from './scenes/RegisterScene.updated.js';
import BootScene from './scenes/bootScene.js';
import PreloaderScene from './scenes/Preloader.js';
import GameScene from './scenes/GameScene.js'; 
import UIScene from './scenes/uiScene.js';  
import HomeScenes from './scenes/homeScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import StatsScene from './scenes/StatsScene.js';
import CreateRoomScene from './scenes/createRoomScene.js';
import GameSceneLAN from './scenes/GameSceneLAN.js';
import DifficultySelectScene from './scenes/DifficultySelectScene.js';
import PauseScene from './scenes/PauseScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import CardsScene from './scenes/cardsScene.js';
import MissionsScene from './scenes/MissionsScene.js';
import ProfileScene from './scenes/ProfileScene.js';
import AboutScene from './scenes/AboutScene.js';
import MechanicsScene from './scenes/MechanicsScene.js';

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#1a1a1a',
    dom: { createContainer: true },
    width: document.getElementById('game-container').clientWidth || window.innerWidth,
    height: document.getElementById('game-container').clientHeight || window.innerHeight,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: document.getElementById('game-container').clientWidth || window.innerWidth,
        height: document.getElementById('game-container').clientHeight || window.innerHeight
    },
    parent: 'game-container',
    // Ajustes de renderizado para buen rendimiento en cualquier dispositivo
    // (WebGL por defecto y fallo automático a Canvas en navegadores sin soporte).
    render: {
        antialias: true,
        roundPixels: false,
        powerPreference: 'high-performance',
        batchSize: 4096
    },
    // FPS estables en pantallas con tasa de refresco variable/alta y en
    // dispositivos de bajos recursos.
    fps: {
        min: 30,
        target: 60,
        smoothStep: true
    },
    loader: {
        // Generamos mipmaps durante la carga para evitar tirones (stutter) y advertencias de WebGL.
        generateMipmap: true,
        // Límite de descargas en paralelo más prudente: evita saturar las
        // conexiones limitadas de móviles.
        maxParallelDownloads: 8
    },
    title: 'Elemental Battlecards',
    /*
      * El orden de las escenas es importante. Phaser iniciará la primera escena de este array.
     * 1. BootScene: Carga los assets mínimos de la pantalla de carga.
     * 2. PreloaderScene: Carga el resto de los recursos del juego.
     * 3. LoginScene: La pantalla de inicio de sesión será el punto de entrada para el usuario.
     * 4. RegisterScene: Escena para el registro de nuevos usuarios.
     * 5. HomeScenes: El menú principal o lobby después de que el usuario inicie sesión.
     * 6. DifficultySelectScene: Escena para seleccionar dificultad contra el bot.
     * 7. CreateRoomScene: Escena para crear una nueva partida.
     * 8. GameSceneLAN: Escena de transición para partidas LAN.
     * 9. GameScene: La escena principal del juego donde ocurre la acción.
     * 10. UIScene: Se ejecuta en paralelo a GameScene para mostrar la interfaz de usuario.
     */
    scene: [ BootScene, PreloaderScene, LoginScene, RegisterScene, HomeScenes, SettingsScene, StatsScene, DifficultySelectScene, CreateRoomScene, GameSceneLAN, GameScene, UIScene, PauseScene, LoadingScene, CardsScene, MissionsScene, ProfileScene, AboutScene, MechanicsScene ]
}

const game = new Phaser.Game(config);

// Gancho de depuración: permite inspeccionar/navegar escenas desde la consola
// del navegador (p. ej. capturas de pantalla automatizadas de la escena de combate).
window.game = game;

// Oculta la pantalla de carga estática (index.html) cuando Phaser está listo.
game.events.once('ready', () => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 500);
    }
});
