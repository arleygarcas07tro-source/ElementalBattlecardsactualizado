import Phaser from 'phaser';

import { ensureFxTextures } from './cardFx.js';
import { play as playSfx } from './audioManager.js';

/**
 * Bombardeo ambiental del campo de batalla (solo presentación).
 *
 * Responsabilidad agregada: lanzar bombas decorativas sobre las filas del
 * campo, animar su caída y detonarlas con explosiones, humo y escombros. Es
 * puramente visual: no consulta ni muta el estado de la partida, no destruye
 * cartas y no afecta turnos, reglas ni sincronización LAN. La escena solo
 * arranca y detiene el servicio.
 */

const BOMB_TEXTURE = 'fx-bomb';
const BOMB_TEXTURE_KEY = BOMB_TEXTURE;

export default class BattlefieldBombs {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} layout Layout de batalla (fieldRow, opponentFieldY, playerFieldY).
     * @param {object} [options]
     * @param {number} [options.firstDelay=2600] Espera hasta la primera bomba.
     * @param {number} [options.minDelay=4200] Espera mínima entre bombas.
     * @param {number} [options.maxDelay=7600] Espera máxima entre bombas.
     * @param {number} [options.depth=30] Profundidad de los objetos del efecto.
     */
    constructor(scene, layout = {}, {
        firstDelay = 2600,
        minDelay = 4200,
        maxDelay = 7600,
        depth = 30
    } = {}) {
        this.scene = scene;
        this.layout = layout;
        this.firstDelay = firstDelay;
        this.minDelay = minDelay;
        this.maxDelay = Math.max(minDelay, maxDelay);
        this.depth = depth;

        this._timer = null;
        this._running = false;
        this._active = new Set();
    }

    /** Arranca el bombardeo continuo. */
    start() {
        if (this._running) return this;
        this._running = true;
        ensureFxTextures(this.scene);
        ensureBombTexture(this.scene);
        this._schedule(this.firstDelay);
        return this;
    }

    /**
     * Lanza una ráfaga rápida de bombas sobre el campo (solo visual).
     * @param {{count?: number, interval?: number}} [opts]
     */
    barrage({ count = 30, interval = 70 } = {}) {
        if (!this.scene) return this;
        this._running = true;
        ensureFxTextures(this.scene);
        ensureBombTexture(this.scene);
        let i = 0;
        const drop = () => {
            if (!this._running || i >= count) return;
            this._dropBomb();
            i += 1;
            this.scene.time.delayedCall(interval, drop);
        };
        drop();
        return this;
    }

    /** Detiene el bombardeo y libera los objetos en vuelo. */
    stop() {
        this._running = false;
        if (this._timer) {
            this._timer.remove(false);
            this._timer = null;
        }
        this._active.forEach((obj) => {
            try { this.scene.tweens.killTweensOf(obj); } catch { /* ignorar */ }
            try { obj.destroy(); } catch { /* ignorar */ }
        });
        this._active.clear();
    }

    _schedule(delay = null) {
        if (!this._running) return;
        const wait = delay === null
            ? Phaser.Math.Between(this.minDelay, this.maxDelay)
            : delay;
        this._timer = this.scene.time.delayedCall(wait, () => {
            this._timer = null;
            this._dropBomb();
        });
    }

    /** Elige un slot del campo (de cualquiera de las dos filas) como objetivo. */
    _pickTarget() {
        const xs = Array.isArray(this.layout.fieldRow) && this.layout.fieldRow.length
            ? this.layout.fieldRow
            : this._fallbackRow();
        const x = Phaser.Utils.Array.GetRandom(xs);
        const rows = [this.layout.opponentFieldY, this.layout.playerFieldY]
            .filter((y) => typeof y === 'number');
        const y = rows.length ? Phaser.Utils.Array.GetRandom(rows) : this.scene.scale.height / 2;
        return { x, y };
    }

    _fallbackRow() {
        const width = this.scene.scale.width;
        const cardWidth = this.layout.cardField?.width ?? 108;
        const gap = this.layout.fieldGap ?? 22;
        const total = cardWidth * 6 + gap * 5;
        const start = width / 2 - total / 2 + cardWidth / 2;
        return Array.from({ length: 6 }, (_, i) => start + i * (cardWidth + gap));
    }

    _dropBomb() {
        if (!this._running) return;

        const { x: targetX, y: targetY } = this._pickTarget();
        const startX = targetX + Phaser.Math.Between(-26, 26);
        const startY = -90;
        const depth = this.depth;

        const warning = this._createWarningMarker(targetX, targetY, depth - 6);
        const bomb = this.scene.add.image(startX, startY, BOMB_TEXTURE)
            .setDepth(depth)
            .setScale(0.9)
            .setAngle(Phaser.Math.Between(-24, 24));
        this._active.add(bomb);
        this._active.add(warning);

        let trail = null;
        if (this.scene.textures.exists('fx-pixel')) {
            trail = this.scene.add.particles(0, 0, 'fx-pixel', {
                follow: bomb,
                lifespan: 460,
                frequency: 34,
                quantity: 1,
                speedX: { min: -22, max: 22 },
                speedY: { min: -34, max: -10 },
                scale: { start: 0.34, end: 0 },
                alpha: { start: 0.55, end: 0 },
                tint: [0xffb066, 0xff7b3c, 0x8a5a3c],
                blendMode: 'ADD'
            }).setDepth(depth - 1);
            this._active.add(trail);
        }

        playSfx('bomb-drop', this.scene);

        const fallDuration = Phaser.Math.Between(820, 1020);
        this.scene.tweens.add({
            targets: bomb,
            x: targetX,
            y: targetY,
            angle: bomb.angle + Phaser.Math.Between(210, 330),
            scaleX: 1,
            scaleY: 1,
            duration: fallDuration,
            ease: 'Quad.easeIn',
            onComplete: () => {
                if (trail) {
                    trail.stop();
                    this.scene.time.delayedCall(520, () => {
                        this._active.delete(trail);
                        try { trail.destroy(); } catch { /* ignorar */ }
                    });
                }
                this._active.delete(bomb);
                this._active.delete(warning);
                try { bomb.destroy(); } catch { /* ignorar */ }
                try { this.scene.tweens.killTweensOf(warning); } catch { /* ignorar */ }
                try { warning.destroy(); } catch { /* ignorar */ }

                this._explode(targetX, targetY);
                this._schedule();
            }
        });
    }

    _createWarningMarker(x, y, depth) {
        const g = this.scene.add.graphics().setDepth(depth).setAlpha(0);
        g.lineStyle(2, 0xff6b35, 0.9).strokeCircle(x, y, 44);
        g.lineStyle(1, 0xffd75a, 0.75).strokeCircle(x, y, 34);
        g.lineStyle(3, 0xff6b35, 0.85);
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
            g.lineBetween(x + dx * 44, y + dy * 44, x + dx * 56, y + dy * 56);
        });
        g.fillStyle(0xff6b35, 0.55);
        g.fillCircle(x, y, 5);
        g.fillStyle(0xffd75a, 0.9);
        g.fillCircle(x, y, 2.5);

        this.scene.tweens.add({
            targets: g,
            alpha: { from: 0, to: 1 },
            duration: 160,
            ease: 'Sine.easeOut'
        });
        this.scene.tweens.add({
            targets: g,
            scaleX: 1.14,
            scaleY: 1.14,
            duration: 340,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        return g;
    }

    _explode(x, y) {
        const depth = this.depth + 20;
        ensureFxTextures(this.scene);
        playSfx('explosion', this.scene);

        this.scene.cameras.main.shake(130, 0.0055);

        const flash = this.scene.add.image(x, y, 'fx-glow')
            .setTint(0xffcf7a)
            .setDepth(depth)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.35)
            .setAlpha(0.98);
        this.scene.tweens.add({
            targets: flash,
            alpha: { from: 0.98, to: 0 },
            scale: { from: 0.35, to: 2.5 },
            duration: 320,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });

        this._shockwave(x, y, 0xffd75a, 1.2, 420, depth - 1);
        this._shockwave(x, y, 0xff6b35, 2.1, 560, depth - 2);

        this._particleBurst(x, y, depth, {
            speed: { min: 160, max: 560 },
            lifespan: { min: 380, max: 760 },
            scale: { start: 0.65, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xfff3c4, 0xffd75a, 0xff9a3c, 0xff5a1f],
            blendMode: 'ADD'
        }, 42);

        this._particleBurst(x, y, depth - 3, {
            speed: { min: 30, max: 140 },
            lifespan: { min: 650, max: 1200 },
            scale: { start: 0.5, end: 1.6 },
            alpha: { start: 0.5, end: 0 },
            speedY: { min: -90, max: -30 },
            tint: [0x6b6f78, 0x4a4d55, 0x2f3138]
        }, 20);

        this._particleBurst(x, y, depth - 2, {
            speed: { min: 140, max: 360 },
            lifespan: { min: 420, max: 760 },
            scale: { start: 0.34, end: 0.05 },
            alpha: { start: 1, end: 0 },
            gravityY: 780,
            tint: [0x3a2c1f, 0x241a12, 0x110c08]
        }, 16);

        const scorch = this.scene.add.graphics().setDepth(depth - 8).setAlpha(0.6);
        scorch.fillStyle(0x05070e, 0.85).fillEllipse(x, y + 12, 74, 26);
        scorch.fillStyle(0xff6b35, 0.18).fillEllipse(x, y + 12, 52, 16);
        this.scene.tweens.add({
            targets: scorch,
            alpha: 0,
            duration: 1500,
            ease: 'Quad.easeIn',
            onComplete: () => scorch.destroy()
        });
    }

    _shockwave(x, y, color, endScale, duration, depth) {
        const ring = this.scene.add.graphics().setDepth(depth);
        ring.lineStyle(4, color, 0.95).strokeCircle(0, 0, 58);
        ring.lineStyle(1.5, 0xffffff, 0.65).strokeCircle(0, 0, 46);
        ring.setPosition(x, y).setScale(0.12);
        this.scene.tweens.add({
            targets: ring,
            scale: endScale,
            alpha: 0,
            duration,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    _particleBurst(x, y, depth, config, count) {
        if (!this.scene.textures.exists('fx-pixel')) return;
        const emitter = this.scene.add.particles(x, y, 'fx-pixel', {
            ...config,
            angle: { min: 0, max: 360 },
            emitting: false
        }).setDepth(depth);
        emitter.explode(count);
        this.scene.time.delayedCall(1400, () => {
            try { emitter.destroy(); } catch { /* ignorar */ }
        });
    }
}

/** Genera la textura procedural de la bomba (esfera metálica con mecha). */
function ensureBombTexture(scene) {
    if (scene.textures.exists(BOMB_TEXTURE_KEY)) return;

    const W = 64;
    const H = 80;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x000000, 0.35).fillEllipse(32, 68, 42, 12);

    g.fillStyle(0x0a0d14, 1).fillCircle(32, 45, 23);
    g.fillStyle(0x1b2230, 1).fillCircle(30, 43, 20);
    g.fillStyle(0x2f3b4f, 1).fillCircle(26, 39, 14);
    g.fillStyle(0x6f819c, 0.9).fillCircle(25, 37, 7);
    g.fillStyle(0xffffff, 0.45).fillCircle(23, 34, 3.2);

    g.lineStyle(3, 0x080b11, 0.95).strokeCircle(32, 45, 23);
    g.fillStyle(0x080b11, 1).fillRect(28, 22, 8, 7);
    g.fillStyle(0xbf8a45, 1).fillCircle(32, 21, 3.4);

    g.lineStyle(3, 0x8a6a3f, 1);
    g.beginPath();
    g.moveTo(32, 19);
    g.lineTo(42, 11);
    g.lineTo(54, 10);
    g.strokePath();

    g.fillStyle(0xffd75a, 1).fillCircle(55, 9, 4.5);
    g.fillStyle(0xffffff, 1).fillCircle(55, 9, 2.2);

    g.generateTexture(BOMB_TEXTURE_KEY, W, H);
    g.destroy();
}
