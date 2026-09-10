import { CARD_TYPES } from './constants.js';
import { play as playSfx } from './audioManager.js';

/**
 * Efectos visuales reutilizables para las cartas.
 * Mantiene la lógica de presentación fuera de las escenas (SOLID).
 */

export const TYPE_COLORS = {
    [CARD_TYPES.FUEGO]: 0xff6b35,
    [CARD_TYPES.AGUA]: 0x35c6ff,
    [CARD_TYPES.PLANTA]: 0x2be48a,
    [CARD_TYPES.LUZ]: 0xffd75a,
    [CARD_TYPES.SOMBRA]: 0xb44dff,
    [CARD_TYPES.ESPIRITU]: 0x5ce3ff
};

/**
 * Genera (si no existen) las texturas procedurales usadas por los efectos:
 *  - 'fx-pixel': punto blanco de 16x16 para emisores de partículas.
 *  - 'fx-glow':  resplandor radial suave de 128x128 para destellos.
 * @param {Phaser.Scene} scene
 */
export function ensureFxTextures(scene) {
    if (!scene.textures.exists('fx-pixel')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(8, 8, 8);
        g.generateTexture('fx-pixel', 16, 16);
        g.destroy();
    }

    if (!scene.textures.exists('fx-glow')) {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
        gradient.addColorStop(0.4, 'rgba(255,255,255,0.45)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        scene.textures.addCanvas('fx-glow', canvas);
    }
}

/**
 * Destello radial que crece y se desvanece en una posición.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} color - Color en formato 0xRRGGBB.
 */
function fireFlash(scene, x, y, color) {
    const flash = scene.add.image(x, y, 'fx-glow')
        .setTint(color)
        .setDepth(100)
        .setScale(0.25)
        .setAlpha(0);

    scene.tweens.add({
        targets: flash,
        alpha: { from: 0.95, to: 0 },
        scale: { from: 0.25, to: 1.6 },
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy()
    });
}

/**
 * Explosión de partículas del color indicado en una posición.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} color
 * @param {number} [count=26]
 */
function fireBurst(scene, x, y, color, count = 26) {
    const particles = scene.add.particles(x, y, 'fx-pixel', {
        speed: { min: 100, max: 280 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 500,
        tint: color,
        emitting: false
    });

    particles.explode(count);
    scene.time.delayedCall(700, () => particles.destroy());
}

/**
 * Anima una fusión de cartas:
 *  1. La carta fuente vuela hacia la carta objetivo (convergencia).
 *  2. En el impacto emite un destello y partículas del color del tipo.
 *  3. Destruye ambas cartas y avisa con onComplete para que el llamador
 *     cree y anime la carta resultante (pop-in).
 *
 * Los tweens se encadenan, por lo que la secuencia completa tarda ~420ms.
 * El llamador debe gestionar su contador de animaciones bloqueantes.
 *
 * @param {Phaser.Scene} scene
 * @param {object} config - { sourceCard, targetCard, type }
 * @param {Function} [onComplete]
 */
export function playFusionFx(scene, config, onComplete) {
    ensureFxTextures(scene);

    const { sourceCard, targetCard, type } = config;
    const color = TYPE_COLORS[type] || 0xffffff;
    const targetX = targetCard.x;
    const targetY = targetCard.y;

    // El callback debe invocarse SIEMPRE: si la carta fuente se destruye a mitad
    // del vuelo, Phaser cancela el onComplete del tween sin avisar y el llamador
    // quedaría esperando para siempre (turno congelado). Por eso el fin de la
    // fusión lo garantiza un timer de seguridad además del flujo normal.
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        if (sourceCard && sourceCard.active && sourceCard.destroy) sourceCard.destroy();
        if (targetCard && targetCard.active && targetCard.destroy) targetCard.destroy();
        if (onComplete) onComplete();
    };

    // Pulso de absorción en la carta objetivo mientras la fuente converge.
    scene.tweens.add({
        targets: targetCard,
        scale: targetCard.scale * 1.12,
        duration: 220,
        yoyo: true,
        ease: 'Sine.easeInOut'
    });

    // Fase 1 — la fuente vuela al objetivo.
    scene.tweens.add({
        targets: sourceCard,
        x: targetX,
        y: targetY,
        scale: sourceCard.scale * 1.1,
        duration: 240,
        ease: 'Sine.easeIn',
        onComplete: () => {
            // Fase 2 — impacto: destello + partículas del tipo.
            fireFlash(scene, targetX, targetY, color);
            fireBurst(scene, targetX, targetY, color);

            if (sourceCard && sourceCard.active) sourceCard.setVisible(false);
            if (targetCard && targetCard.active) targetCard.setVisible(false);

            // Fase 3 — limpieza de los objetos originales.
            scene.time.delayedCall(180, finish);
        }
    });

    // Red de seguridad: garantiza finish() aunque la fuente muera en vuelo.
    scene.time.delayedCall(750, finish);

    // Efecto de sonido de la fusión.
    playSfx('fusion', scene);
}

/**
 * Efecto de impacto de un ataque: flash blanco, anillo de choque expansivo y
 * chispas del color del defensor. No es bloqueante por sí mismo.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} [color=0xffffff]
 */
export function playImpactFx(scene, x, y, color = 0xffffff) {
    ensureFxTextures(scene);

    // Flash blanco breve.
    const flash = scene.add.image(x, y, 'fx-glow')
        .setTint(0xffffff)
        .setDepth(100)
        .setScale(0.5)
        .setAlpha(0);

    scene.tweens.add({
        targets: flash,
        alpha: { from: 1, to: 0 },
        scale: { from: 0.5, to: 1.15 },
        duration: 200,
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy()
    });

    // Anillo de choque expansivo del color del tipo.
    const ring = scene.add.graphics().setDepth(100);
    ring.lineStyle(4, color, 1);
    ring.strokeCircle(x, y, 70);
    ring.setScale(0.15);

    scene.tweens.add({
        targets: ring,
        scale: 1.4,
        alpha: 0,
        duration: 320,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
    });

    // Chispas del color del defensor.
    fireBurst(scene, x, y, color, 14);

    // Efecto de sonido del impacto.
    playSfx('hit', scene);
}

/**
 * "Pop" individual de fuego artificial: puff de resplandor que crece y
 * se desvanece + un buen de partículas del color indicado.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} color
 */
function fireworkPop(scene, x, y, color) {
    const puff = scene.add.image(x, y, 'fx-glow')
        .setTint(color)
        .setDepth(95)
        .setScale(0.3)
        .setAlpha(0.9);

    scene.tweens.add({
        targets: puff,
        alpha: { from: 0.9, to: 0 },
        scale: { from: 0.35, to: 1.4 },
        duration: 450,
        ease: 'Cubic.easeOut',
        onComplete: () => puff.destroy()
    });

    fireBurst(scene, x, y, color, 16);
}

/**
 * Fuegos artificiales: varias explosiones escalonadas alrededor de un punto
 * alternando el color del tipo con blanco. Se usa para realzar el nacimiento
 * de una carta sin alterar su tamaño.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} color
 * @param {number} [bursts=3]
 */
export function playFireworksFx(scene, x, y, color, bursts = 3) {
    ensureFxTextures(scene);

    playSfx('firework', scene);

    for (let i = 0; i < bursts; i++) {
        scene.time.delayedCall(i * 120, () => {
            const offsetX = Phaser.Math.Between(-42, 42);
            const offsetY = Phaser.Math.Between(-28, 28);
            fireworkPop(scene, x + offsetX, y + offsetY, i % 2 === 0 ? color : 0xffffff);
        });
    }
}

/**
 * Muerte de una carta: se desvanece girando y creciendo ligeramente mientras
 * emite partículas del color de su elemento. Bloqueante.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.GameObject} cardObject - Objeto visual de la carta.
 * @param {object} [cardData] - Datos de la carta (para el color del efecto).
 * @param {Function} [onComplete]
 */
export function playDeathFx(scene, cardObject, cardData, onComplete) {
    ensureFxTextures(scene);

    // Si la carta ya no está viva (fue destruida por otra vía), no animamos:
    // es el llamador quien gestiona la liberación del bloqueo.
    if (!cardObject || !cardObject.active) {
        if (onComplete) onComplete();
        return;
    }

    const x = cardObject.x;
    const y = cardObject.y;
    const color = (cardData && TYPE_COLORS[cardData.type]) || 0xffffff;

    // Las partículas del elemento salen al morir.
    fireBurst(scene, x, y, color, 22);

    // Efecto de sonido de la muerte.
    playSfx('death', scene);

    // La carta se desvanece girando y creciendo ligeramente.
    scene.tweens.add({
        targets: cardObject,
        scale: cardObject.scale * 1.15,
        alpha: { from: 1, to: 0 },
        angle: cardObject.angle + 14,
        duration: 340,
        ease: 'Power2',
        onComplete: () => {
            if (cardObject && cardObject.active && cardObject.destroy) cardObject.destroy();
            if (onComplete) onComplete();
        }
    });
}