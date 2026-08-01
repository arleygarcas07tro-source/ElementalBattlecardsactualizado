import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Carga los assets mínimos necesarios para la pantalla de carga (PreloaderScene)
        // Por ejemplo, el fondo de la barra de progreso y los iconos elementales.
        this.load.image("loading-background", "/assets/images/pantalla de carga/pantalla de carga.jpeg"); // Asset para el fondo de la pantalla de carga
        this.load.image("loading-logo", "/assets/images/Logotipoletras.png"); // Asset para el logo en la pantalla de carga
        this.load.image("icon-agua", "/assets/images/iconos/agua.jpeg");
        this.load.image("icon-fuego", "/assets/images/iconos/fuego.jpeg");
        this.load.image("icon-planta", "/assets/images/iconos/planta.jpeg");
        this.load.image("icon-sombra", "/assets/images/iconos/sombra.jpeg");
        this.load.image("icon-luz", "/assets/images/iconos/luz.jpeg");
        this.load.image("icon-espiritu", "/assets/images/iconos/espiritu.jpeg");

        console.log('BootScene: Preload completado.');
    }

    create() {
        console.log('BootScene: Create. Lanzando PreloaderScene...');
        // Una vez que los assets de la barra de carga están listos,
        // inicia la escena de precarga.
        this.scene.start('Preloader');
    }
}