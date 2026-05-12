import Phaser from 'phaser';
import LoginScene from './scenes/LoginScene.js';
import RegisterScene from './scenes/RegisterScene.updated.js';
import PreloaderScene from './scenes/Preloader.js';
import GameScene from './scenes/GameScene.js'; 
import UIScene from './scenes/uiScene.js';  
import HomeScenes from './scenes/homeScenes.js';
import CreateRoomScene from './scenes/createRoomScene.js';
import GameSceneLAN from './scenes/GameSceneLAN.js';
import DifficultySelectScene from './scenes/DifficultySelectScene.js';

const config = {
    type: Phaser.AUTO,
    dom: { createContainer: true },
    width: 1600,
    height: 1000,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    parent: 'game-container',
    loader: {
        // Generamos mipmaps durante la carga para evitar tirones (stutter) y advertencias de WebGL.
        generateMipmap: true
    },
    /*
     * El orden de las escenas es importante. Phaser iniciará la primera escena de este array.
     * 1. PreloaderScene: Debería ser la primera para cargar los assets iniciales.
     * 2. LoginScene: La pantalla de inicio de sesión será el punto de entrada para el usuario.
     * 3. RegisterScene: Escena para el registro de nuevos usuarios.
     * 4. HomeScenes: El menú principal o lobby después de que el usuario inicie sesión.
     * 5. DifficultySelectScene: Escena para seleccionar dificultad contra el bot.
     * 6. CreateRoomScene: Escena para crear una nueva partida.
     * 7. GameSceneLAN: Escena de transición para partidas LAN.
     * 8. GameScene: La escena principal del juego donde ocurre la acción.
     * 9. UIScene: Se ejecuta en paralelo a GameScene para mostrar la interfaz de usuario.
     */
    scene: [ LoginScene, RegisterScene, PreloaderScene, HomeScenes, DifficultySelectScene, CreateRoomScene, GameSceneLAN, GameScene, UIScene ]
}

const game = new Phaser.Game(config);
