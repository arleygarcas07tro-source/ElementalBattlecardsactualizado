/**
 * Helpers de presentación para fondos de video en las escenas de menú.
 * Unifican el bloque idéntico que repetían homeScene, DifficultySelectScene y
 * createRoomScene: carga perezosa, rectángulo de respaldo y configuración del
 * video en modo "cover".
 */

/**
 * Carga un video si aún no está en la caché (evita descargas duplicadas).
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {string} url
 */
export function loadVideoIfNeeded(scene, key, url) {
    if (!scene.cache.video.exists(key)) {
        scene.load.video(key, url, { muted: true, noAudio: true });
    }
}

/**
 * Crea el fondo de video a pantalla completa sobre un rectángulo de respaldo
 * para que nunca se vea un hueco negro mientras el video prepara su primer frame.
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {number} [fallbackColor]
 * @returns {Phaser.GameObjects.Video}
 */
export function createVideoBackground(scene, key, fallbackColor = 0x0a0e22) {
    const { width, height } = scene.scale;

    scene.add.rectangle(width / 2, height / 2, width, height, fallbackColor).setDepth(-2);

    const bg = scene.add.video(width / 2, height / 2, key).setOrigin(0.5);
    bg.setDepth(-1);

    bg.on('play', () => {
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);
    });

    bg.once('ready', () => {
        const videoEl = bg.video;
        if (!videoEl) return;
        videoEl.muted = true;
        videoEl.defaultMuted = true;
        videoEl.loop = true;
        videoEl.playbackRate = 1;
        videoEl.playsInline = true;
        videoEl.preload = 'auto';
        videoEl.currentTime = 0;
        videoEl.play().catch(() => {});
    });

    bg.play(true);
    return bg;
}