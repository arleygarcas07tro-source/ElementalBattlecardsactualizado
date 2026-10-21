import { ensureFxTextures } from './cardFx.js';

/**
 * Feedback visual de la batalla (solo presentación, sin lógica de reglas).
 *
 * Responsabilidad agregada: comunicar al jugador, mediante señales visuales
 * breves y reversibles, qué acciones están disponibles en el momento:
 *  - Highlights pulsantes de slot (colocación válida, ataque directo).
 *  - Marcadores flotantes sobre cartas objetivo (ventaja / desventaja /
 *    neutral / fusión compatible).
 *  - Banner de evolución al fusionar (refuerza el salto de nivel sin
 *    bloquear la lógica del turno).
 *  - Toasts efímeros para explicar por qué una acción no está permitida.
 *  - Franja de brillo que indica de quién es el turno.
 *
 * No importa Phaser como módulo: usa el global cargado por `main.js`,
 * igual que el resto de helpers de presentación.
 */

/** Paleta de los estados de feedback (consistente con battlefieldArt). */
export const FEEDBACK_COLORS = {
    valid: 0x49d17a,      // colocación permitida
    fusion: 0xffd75a,     // fusión compatible
    advantage: 0x49d17a,  // gana ventaja elemental
    disadvantage: 0xff5a3c, // pierde contra el objetivo
    neutral: 0x9fb0c8,    // resultado neutral
    attack: 0xff5a3c      // ataque directo disponible
};

const MARKER_LABELS = {
    advantage: '▲',
    disadvantage: '▼',
    neutral: '•',
    fusion: '✦'
};

/**
 * Textura (blanca, tintada en tiempo real) de marco resaltante para slots.
 * Se genera una sola vez por escena.
 * @param {Phaser.Scene} scene
 */
export function ensureHighlightTexture(scene) {
    const key = 'art-slot-highlight';
    if (scene.textures.exists(key)) return;
    const W = 148;
    const H = 196;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // Halo exterior suave.
    g.fillStyle(0xffffff, 0.16).fillRoundedRect(0, 0, W, H, 22);
    // Marco de energía pulsante.
    g.lineStyle(5, 0xffffff, 0.95).strokeRoundedRect(4, 4, W - 8, H - 8, 20);
    g.lineStyle(2, 0xffffff, 0.55).strokeRoundedRect(11, 11, W - 22, H - 22, 15);
    // Puntas en las esquinas (acentos de puntería).
    const diamond = (x, y, r) => g.fillPoints([
        new Phaser.Geom.Point(x, y - r), new Phaser.Geom.Point(x + r, y),
        new Phaser.Geom.Point(x, y + r), new Phaser.Geom.Point(x - r, y)
    ], true);
    g.fillStyle(0xffffff, 1);
    diamond(4, 4, 9); diamond(W - 4, 4, 9); diamond(4, H - 4, 9); diamond(W - 4, H - 4, 9);
    g.generateTexture(key, W, H);
    g.destroy();
}

/**
 * Crea un highlight pulsante sobre un slot. El llamador lo destruye al
 * limpiar el feedback de selección.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} color Color del estado (FEEDBACK_COLORS).
 * @param {number} [depth=5]
 * @returns {Phaser.GameObjects.Image}
 */
export function createSlotHighlight(scene, x, y, color, depth = 5) {
    ensureHighlightTexture(scene);
    ensureFxTextures(scene);
    const img = scene.add.image(x, y, 'art-slot-highlight')
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(depth)
        .setAlpha(0.85);
    scene.tweens.add({
        targets: img,
        alpha: { from: 0.45, to: 1 },
        scale: { from: 0.97, to: 1.04 },
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    return img;
}

/**
 * Crea un marcador flotante sobre una carta objetivo (ventaja, desventaja,
 * neutral o fusión). El llamador lo destruye al limpiar la selección.
 * @param {Phaser.Scene} scene
 * @param {number} x Coordenada X sobre la carta.
 * @param {number} y Coordenada Y sobre la carta.
 * @param {'advantage'|'disadvantage'|'neutral'|'fusion'} kind
 * @param {number} [depth=30]
 * @returns {Phaser.GameObjects.Container}
 */
export function createTargetMarker(scene, x, y, kind, depth = 30) {
    ensureFxTextures(scene);
    const color = FEEDBACK_COLORS[kind] || FEEDBACK_COLORS.neutral;
    const container = scene.add.container(x, y).setDepth(depth);

    const halo = scene.add.image(0, 0, 'fx-glow')
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.42)
        .setAlpha(0.75);
    container.add(halo);

    const disc = scene.add.graphics();
    disc.fillStyle(0x05070e, 0.92).fillCircle(0, 0, 17);
    disc.lineStyle(3, color, 1).strokeCircle(0, 0, 17);
    disc.lineStyle(1, 0xffffff, 0.35).strokeCircle(0, 0, 13);
    container.add(disc);

    const label = scene.add.text(0, 1, MARKER_LABELS[kind] || '•', {
        fontFamily: 'Georgia, serif',
        fontSize: kind === 'neutral' ? '20px' : '17px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);
    container.add(label);

    if (kind === 'fusion') {
        const sub = scene.add.text(0, 26, 'FUSIÓN', {
            fontFamily: 'Arial', fontSize: '10px', fontStyle: 'bold',
            color: '#ffd75a', stroke: '#000000', strokeThickness: 3, letterSpacing: 1
        }).setOrigin(0.5);
        container.add(sub);
    }

    container.setScale(0);
    scene.tweens.add({
        targets: container,
        scale: { from: 0, to: 1 },
        duration: 180,
        ease: 'Back.easeOut'
    });
    scene.tweens.add({
        targets: halo,
        alpha: { from: 0.4, to: 0.9 },
        scale: { from: 0.38, to: 0.5 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    return container;
}

/**
 * Destruye con animación la lista de objetos de feedback de selección.
 * Tolera elementos ya destruidos (la escena puede haberlos borrado).
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.GameObject[]} objects
 */
export function destroyFeedbackList(scene, objects) {
    if (!objects || !objects.length) return;
    objects.forEach((obj) => {
        if (!obj || !obj.scene) return;
        scene.tweens.add({
            targets: obj,
            alpha: 0,
            scale: 0.85,
            duration: 130,
            ease: 'Power1',
            onComplete: () => { if (obj && obj.scene) obj.destroy(); }
        });
    });
}

/**
 * Banner de evolución: anuncia la creación de una carta de nivel superior
 * tras una fusión. Es puramente informativo y no bloquea el turno.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} color Color del elemento fusionado.
 * @param {number} newLevel Nivel resultante (2 o 3).
 */
export function playEvolutionBanner(scene, x, y, color, newLevel) {
    ensureFxTextures(scene);
    const roman = newLevel === 3 ? 'III' : 'II';

    const container = scene.add.container(x, y).setDepth(400);
    container.setScale(0.6).setAlpha(0);

    const glow = scene.add.image(0, 0, 'fx-glow')
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(2.4)
        .setAlpha(0.55);
    container.add(glow);

    const g = scene.add.graphics();
    g.fillStyle(0x05070e, 0.94).fillRoundedRect(-190, -34, 380, 68, 14);
    g.lineStyle(3, color, 1).strokeRoundedRect(-190, -34, 380, 68, 14);
    g.lineStyle(1, 0xffffff, 0.30).strokeRoundedRect(-183, -27, 366, 54, 10);
    const diamond = (px, py, r) => g.fillPoints([
        new Phaser.Geom.Point(px, py - r), new Phaser.Geom.Point(px + r, py),
        new Phaser.Geom.Point(px, py + r), new Phaser.Geom.Point(px - r, py)
    ], true);
    g.fillStyle(color, 1);
    diamond(-190, -34, 8); diamond(190, -34, 8); diamond(-190, 34, 8); diamond(190, 34, 8);
    container.add(g);

    const title = scene.add.text(0, -12, 'EVOLUCIÓN', {
        fontFamily: 'Georgia, serif', fontSize: '21px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 4, letterSpacing: 4
    }).setOrigin(0.5);
    container.add(title);

    const levelText = scene.add.text(0, 15, `NIVEL ${roman}`, {
        fontFamily: 'Georgia, serif', fontSize: '17px', fontStyle: 'bold',
        color: '#ffd75a', stroke: '#000000', strokeThickness: 4, letterSpacing: 3
    }).setOrigin(0.5);
    container.add(levelText);

    scene.tweens.add({
        targets: container,
        scale: { from: 0.6, to: 1.05 },
        alpha: { from: 0, to: 1 },
        duration: 240,
        ease: 'Back.easeOut'
    });
    scene.tweens.add({
        targets: container,
        y: y - 26,
        alpha: 0,
        delay: 950,
        duration: 420,
        ease: 'Power2',
        onComplete: () => { if (container.scene) container.destroy(); }
    });
    scene.tweens.add({
        targets: glow,
        scale: { from: 1.8, to: 3.2 },
        duration: 900,
        ease: 'Sine.easeOut'
    });
}

/**
 * Toast breve y no invasivo para explicar acciones no permitidas o avisos
 * de la partida. Flota hacia arriba y desaparece.
 * @param {Phaser.Scene} scene
 * @param {string} message
 * @param {number} [color=0xcfaf6d]
 */
export function showBattleToast(scene, message, color = 0xcfaf6d) {
    const x = scene.scale.width / 2;
    const y = scene.scale.height * 0.68;

    const container = scene.add.container(x, y).setDepth(420);
    const g = scene.add.graphics();
    const w = Math.max(240, Math.round(message.length * 9.5) + 56);
    g.fillStyle(0x000000, 0.42).fillRoundedRect(-w / 2 + 2, -17 + 4, w, 34, 10);
    g.fillStyle(0x0a0e1c, 0.95).fillRoundedRect(-w / 2, -17, w, 34, 10);
    g.lineStyle(2, color, 0.95).strokeRoundedRect(-w / 2, -17, w, 34, 10);
    container.add(g);

    const text = scene.add.text(0, 1, message, {
        fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'bold',
        color: '#f1e7cf', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);
    container.add(text);

    container.setAlpha(0).setScale(0.9);
    scene.tweens.add({
        targets: container,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.9, to: 1 },
        duration: 160,
        ease: 'Back.easeOut'
    });
    scene.tweens.add({
        targets: container,
        y: y - 34,
        alpha: 0,
        delay: 1250,
        duration: 380,
        ease: 'Power2',
        onComplete: () => { if (container.scene) container.destroy(); }
    });
}

/**
 * Franja de brillo horizontal que indica el bando con el turno. Se crea una
 * vez por escena y se activa con `setTurnGlowActive`.
 * @param {Phaser.Scene} scene
 * @param {number} y Coordenada Y de la fila de batalla.
 * @param {number} color Color del bando.
 * @param {number} width Ancho de la franja.
 * @returns {Phaser.GameObjects.Image}
 */
export function createTurnGlow(scene, y, color, width) {
    ensureFxTextures(scene);
    const img = scene.add.image(scene.scale.width / 2, y, 'fx-glow')
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(width, 96)
        .setDepth(0.12)
        .setAlpha(0);
    img.setActive(false);
    return img;
}

/**
 * Activa o desactiva el brillo de turno de una franja (el de la otra fila
 * se apaga por efecto espejo desde GameScene).
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Image} glow
 * @param {boolean} active
 */
export function setTurnGlowActive(scene, glow, active) {
    if (!glow || !glow.scene) return;
    scene.tweens.killTweensOf(glow);
    if (active) {
        glow.setAlpha(0.16);
        scene.tweens.add({
            targets: glow,
            alpha: { from: 0.10, to: 0.30 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    } else {
        scene.tweens.add({
            targets: glow,
            alpha: 0,
            duration: 240,
            ease: 'Power1'
        });
    }
}
