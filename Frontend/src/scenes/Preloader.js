import Phaser from 'phaser';

/**
 * Esta escena se encarga de cargar todos los recursos necesarios para el juego
 * antes de que comience. Muestra una barra de progreso durante la carga.
 */
export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        this.createLoadingBar();

        // NOTA: 'loading-background' y 'loading-logo' ya los carga BootScene,
        // así que no se cargan aquí de nuevo (evita descargas duplicadas).

        // NOTA: Las texturas de las cartas (`card-{tipo}-{nivel}`), el reverso
        // (`card-back-player`/`card-back-opponent`) y el slot se cargan en
        // GameScene.pre() cuando hace falta. Aquí NO se precargan: evita
        // peticiones duplicadas y 404 por rutas con espacios.
        this.load.on('loaderror', (file) => {
            console.error('Failed to process file:', file.type, '"' + file.key + '"', file.src || file.url || file.key);
        });
        this.load.on('complete', () => {
            console.log('¡Archivos de preload de Preloader cargados!');
        });

        // NOTA: El video del menú NO se carga aquí. Es pesado y retrasa la entrada
        // al juego; HomeScenes lo carga de forma perezosa la primera vez que se
        // necesita (ya tiene un fondo de respaldo para evitar pantallazos negros).
    }

    /**
     * Una vez que todos los recursos en preload() han sido cargados,
     * este método se ejecuta y lanza la escena principal del juego.
     */
    create() {
        this.scene.start('LoginScene');
    }

    /**
     * Crea los elementos visuales para la barra de carga.
     */
    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Caja de la barra de progreso
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        // Barra de progreso
        const progressBar = this.add.graphics();

        // Texto de carga
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Cargando...',
            style: { font: '20px monospace', fill: '#ffffff' }
        }).setOrigin(0.5, 0.5);

        // Texto de porcentaje
        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: { font: '18px monospace', fill: '#ffffff' }
        }).setOrigin(0.5, 0.5);

        // Evento 'progress' de Phaser que se actualiza durante la carga
        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
    }
}