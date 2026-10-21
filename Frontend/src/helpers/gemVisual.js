import { CARD_TYPES } from './constants.js';
import { TYPE_COLORS, ensureFxTextures } from './cardFx.js';

/**
 * Presentación reutilizable de las gemas elementales.
 * Construye la gema como objeto visual de Phaser (rombo cristal + núcleo
 * brillante con el icono del elemento) y expone una animación de recogida.
 * Mantiene la lógica visual fuera de las escenas (SOLID).
 */

export const ELEMENT_ORDER = [
    CARD_TYPES.FUEGO,
    CARD_TYPES.PLANTA,
    CARD_TYPES.AGUA,
    CARD_TYPES.LUZ,
    CARD_TYPES.SOMBRA,
    CARD_TYPES.ESPIRITU
];

export const ELEMENT_LABELS = {
    [CARD_TYPES.FUEGO]: 'Fuego',
    [CARD_TYPES.AGUA]: 'Agua',
    [CARD_TYPES.PLANTA]: 'Planta',
    [CARD_TYPES.LUZ]: 'Luz',
    [CARD_TYPES.SOMBRA]: 'Sombra',
    [CARD_TYPES.ESPIRITU]: 'Espíritu'
};

export const ELEMENT_SHORT = {
    [CARD_TYPES.FUEGO]: 'FUE',
    [CARD_TYPES.AGUA]: 'AGU',
    [CARD_TYPES.PLANTA]: 'PLA',
    [CARD_TYPES.LUZ]: 'LUZ',
    [CARD_TYPES.SOMBRA]: 'SOM',
    [CARD_TYPES.ESPIRITU]: 'ESP'
};

/**
 * Dibuja un rombo tipo gema en un Graphics (coordenadas locales, centro en 0,0).
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} size Mitad de la altura del rombo.
 * @param {number} color Color del elemento (0xRRGGBB).
 * @param {boolean} filled Estado activo (brillante) o pendiente (apagado).
 */
function drawGemCrystal(g, size, color, filled) {
    const w = size * 0.74;
    const h = size;
    const bodyAlpha = filled ? 0.95 : 0.22;
    const facetLight = filled ? 0.42 : 0.10;
    const facetDark = filled ? 0.28 : 0.08;
    const strokeAlpha = filled ? 0.95 : 0.40;

    g.clear();

    // Cuerpo principal del rombo.
    g.fillStyle(color, bodyAlpha);
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(w, 0);
    g.lineTo(0, h);
    g.lineTo(-w, 0);
    g.closePath();
    g.fillPath();

    // Faceta superior izquierda (brillo).
    g.fillStyle(0xffffff, facetLight);
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(-w, 0);
    g.lineTo(0, 0);
    g.closePath();
    g.fillPath();

    // Faceta inferior derecha (sombra).
    g.fillStyle(0x000000, facetDark);
    g.beginPath();
    g.moveTo(w, 0);
    g.lineTo(0, h);
    g.lineTo(0, 0);
    g.closePath();
    g.fillPath();

    // Borde cristalino.
    g.lineStyle(2, 0xffffff, strokeAlpha);
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(w, 0);
    g.lineTo(0, h);
    g.lineTo(-w, 0);
    g.closePath();
    g.strokePath();
}

/**
 * Crea una gema visual.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} type Elemento ('fuego', 'agua', ...).
 * @param {number} size Tamaño base (mitad de altura del rombo).
 * @param {{filled?: boolean, showCore?: boolean}} [opts]
 * @returns {Phaser.GameObjects.Container} Contenedor con `setFilled(bool)` y `refs`.
 */
export function createGemVisual(scene, x, y, type, size, opts = {}) {
    ensureFxTextures(scene);
    const color = TYPE_COLORS[type] || 0xffffff;
    const filled = opts.filled !== false;
    const showCore = opts.showCore !== false;

    const container = scene.add.container(x, y);
    container.setDepth(opts.depth != null ? opts.depth : 20);

    // Resplandor suave detrás.
    const glow = scene.add.image(0, 0, 'fx-glow')
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale((size * 2.6) / 128)
        .setAlpha(filled ? 0.75 : 0.12);

    // Cristal (rombo).
    const crystal = scene.add.graphics();
    drawGemCrystal(crystal, size, color, filled);

    container.add([glow, crystal]);

    // Núcleo con el icono del elemento (blend aditivo: el fondo negro desaparece).
    let core = null;
    const coreKey = `orb-${type}`;
    if (showCore && scene.textures.exists(coreKey)) {
        core = scene.add.image(0, 0, coreKey)
            .setDisplaySize(size * 1.5, size * 1.5)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(filled ? 1 : 0.32);
        if (!filled) core.setTint(0x888888);
        container.add(core);
    }

    container.refs = { glow, crystal, core, color, type, size };

    /**
     * Actualiza el estado visual de la gema.
     * @param {boolean} isFilled
     */
    container.setFilled = (isFilled) => {
        drawGemCrystal(crystal, size, color, isFilled);
        glow.setAlpha(isFilled ? 0.75 : 0.12);
        if (core) {
            core.setAlpha(isFilled ? 1 : 0.32);
            core.setTint(isFilled ? 0xffffff : 0x888888);
        }
    };

    return container;
}

/**
 * Animación de recogida de una gema: aparece con un "pop", flota hacia
 * arriba con un pequeño giro, destella y se desvanece. No bloqueante.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} type Elemento de la gema.
 * @param {{label?: string}} [opts]
 */
export function playGemCollectFx(scene, x, y, type, opts = {}) {
    ensureFxTextures(scene);
    const color = TYPE_COLORS[type] || 0xffffff;

    // Destello radial.
    const flash = scene.add.image(x, y, 'fx-glow')
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(499)
        .setScale(0.3)
        .setAlpha(0);
    scene.tweens.add({
        targets: flash,
        alpha: { from: 0.9, to: 0 },
        scale: { from: 0.4, to: 1.7 },
        duration: 420,
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy()
    });

    // La gema en sí.
    const gem = createGemVisual(scene, x, y, type, 26, { depth: 500 });
    gem.setScale(0).setAngle(-24);

    scene.tweens.add({
        targets: gem,
        scale: { from: 0, to: 1.25 },
        angle: 0,
        duration: 260,
        ease: 'Back.easeOut'
    });

    scene.tweens.add({
        targets: gem,
        y: y - 78,
        alpha: { from: 1, to: 0 },
        angle: 18,
        scale: 0.9,
        delay: 260,
        duration: 620,
        ease: 'Power2',
        onComplete: () => gem.destroy()
    });

    // Etiqueta "+1".
    const label = scene.add.text(x, y - 42, opts.label || '+1 GEMA', {
        fontFamily: 'Georgia, Arial',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(501).setTint(color);

    label.setScale(0);
    scene.tweens.add({
        targets: label,
        scale: { from: 0, to: 1 },
        duration: 220,
        ease: 'Back.easeOut'
    });
    scene.tweens.add({
        targets: label,
        y: y - 104,
        alpha: { from: 1, to: 0 },
        delay: 300,
        duration: 560,
        ease: 'Power2',
        onComplete: () => label.destroy()
    });
}
