import Phaser from 'phaser';
import { createGemVisual } from '../helpers/gemVisual.js';
import { ensureFxTextures } from '../helpers/cardFx.js';
import {
    ensureBoardTextures,
    cardFrameKey,
    themeFor,
    ELEMENT_GLYPHS,
    CARD_PLATE_TEXTURES,
    LEVEL_ROMANS
} from '../helpers/battlefieldArt.js';

/**
 * Representación visual de una carta (sprite de Phaser). Extiende de
 * Phaser.GameObjects.Sprite y gestiona textura e interacción.
 *
 * Es solo presentación: los datos de dominio (instancia con `instanceId`,
 * `type`, `level`, `owner`) viven en `cardData` y se construyen con
 * `game/CardEntity.js`. No añadir aquí reglas de negocio.
 */
export default class Card extends Phaser.GameObjects.Sprite {

    /**
     * @param {Phaser.Scene} scene La escena a la que pertenece la carta.
     * @param {number} x La posición x inicial.
     * @param {number} y La posición y inicial.
     * @param {string} owner El jugador propietario de la carta ('player1' o 'player2').
     * @param {string} type El tipo de la carta (usando CardTypes).
     * @param {number} [level=1] El nivel de la carta.
     * @param {boolean} [isFaceDown=true] Si la carta está boca abajo.
     */
    constructor(scene, x, y, cardData, isFaceDown = true) {
        // La textura inicial será el reverso de la carta. Asumimos que se carga con la key 'card_back'.
        super(scene, x, y, isFaceDown ? 'card-back-player' : `card-${cardData.type}-${cardData.level}`);

        this.scene = scene;
        this.cardData = cardData; // Guardamos todos los datos
        this.type = cardData.type;
        this.level = cardData.level;
        this.isFaceDown = isFaceDown;
        this.gemBadge = null; // Distintivo de gema (nivel 3), si procede
        this.aura = null; // Aura elemental (presentación), si procede
        this.cardFrame = null; // Marco ornamental elemental por elemento y nivel
        this.shadow = null; // Sombra proyectada bajo la carta
        this.levelPlate = null; // Placa con numeral romano (I/II/III)
        this.levelPlateText = null;
        this.elementSeal = null; // Sello con el glifo del elemento (arriba-derecha)
        this.elementSealText = null;
        this.selectedGlow = null; // Resplandor de carta seleccionada
        this.selectedTween = null;
        this.isSelected = false;

        // Asignamos un nombre al GameObject para facilitar la depuración
        // y añadimos el `instanceId` también como metadata para búsquedas.
        if (cardData && cardData.instanceId) {
            this.setName(cardData.instanceId);
            this.setData('instanceId', cardData.instanceId);
        }

        // Propiedades para las reglas de ataque.
        // NOTA: la restricción por nivel (L2=ataca 2 turnos y descansa 1, L3=ataca 1 y descansa 1)
        // se calcula en GameScene._registerCardAttack usando metadatos en el GameObject
        // (blockedTurn / consecutiveAttacks / lastAttackedTurn). No duplicar aquí.

        // 1. Añadimos la carta a la escena PRIMERO.
        scene.add.existing(this);
        // 2. Hacemos la carta interactiva DESPUÉS de que esté en la escena.
        this.setInteractive();

        // Guardar posición inicial y datos como metadatos para uso de la escena
        this.setData('startPosition', { x, y });
        this.setData('cardData', cardData);

        // Si la carta no está boca abajo desde el principio (ej. por fusión), la revelamos
        if (!this.isFaceDown) {
            this.reveal();
        }

        this.refreshPresentation();
    }

    /**
     * Revela la carta, cambiando su textura a la del tipo y nivel correspondientes.
     * Una vez revelada, no puede volver a ocultarse.
     */
    reveal() {
        if (this.isFaceDown) {
            this.isFaceDown = false;
            // La textura usa el formato 'card-tipo-nivel'
            const textureName = `card-${this.type}-${this.level}`;
            this.setTexture(textureName);
        }
        this.refreshPresentation();
    }

    /**
     * Crea (o recrea) los adornos de presentación de la carta: marco
     * ornamental con identidad elemental, placa de nivel, sello del elemento
     * (arriba-derecha) y sombra proyectada. Es idempotente: primero destruye
     * los adornos previos si existían.
     *
     * El marco vive FUERA del Sprite (imagen independiente sincronizada),
     * de modo que no se deforma con `setDisplaySize` al aplicar el aspect
     * ratio del arte. Su bisel interior deja visible la ilustración.
     */
    refreshPresentation() {
        if (!this.scene || !this.scene.add) return;
        if (this.isFaceDown) {
            // Las cartas boca abajo (reverso del mazo) no llevan adornos.
            this.destroyPresentation();
            return;
        }
        ensureFxTextures(this.scene);
        ensureBoardTextures(this.scene);

        const theme = themeFor(this.type);
        const key = cardFrameKey(this.type, this.level);

        if (!this.cardFrame) {
            this.cardFrame = this.scene.add.image(this.x, this.y, key)
                .setBlendMode(Phaser.BlendModes.NORMAL);
        } else {
            this.cardFrame.setTexture(key);
        }
        // El marco ya viene coloreado por elemento: no se tiñe para no
        // oscurecer su paleta propia.
        try { this.cardFrame.clearTint(); } catch (e) { /* ignore */ }

        if (!this.shadow) {
            this.shadow = this.scene.add.image(this.x, this.y, 'fx-glow')
                .setTint(0x000000)
                .setBlendMode(Phaser.BlendModes.MULTIPLY)
                .setAlpha(0.5);
        }

        // Placa de nivel (numeral romano) al pie de la carta.
        if (!this.levelPlate) {
            this.levelPlate = this.scene.add.image(this.x, this.y, CARD_PLATE_TEXTURES.levelPlate)
                .setTint(0xffe9a8);
            this.levelPlateText = this.scene.add.text(this.x, this.y, '', {
                fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold',
                color: '#241a05'
            }).setOrigin(0.5);
        }
        this.levelPlateText.setText(LEVEL_ROMANS[this.level] || 'I');

        // Sello del elemento (arriba-derecha): anillo tintado + glifo.
        if (!this.elementSeal) {
            this.elementSeal = this.scene.add.image(this.x, this.y, CARD_PLATE_TEXTURES.sealRing)
                .setAlpha(0.95);
            this.elementSealText = this.scene.add.text(this.x, this.y, '', {
                fontSize: '12px'
            }).setOrigin(0.5);
        }
        this.elementSeal.setTint(theme.color);
        this.elementSealText.setText(ELEMENT_GLYPHS[this.type] || '✦');

        // Resplandor de selección (oculto hasta setSelectedVisual(true)).
        if (!this.selectedGlow) {
            this.selectedGlow = this.scene.add.image(this.x, this.y, 'fx-glow')
                .setTint(theme.color)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setAlpha(0);
        }

        this.syncPresentation();
    }

    /** Destruye todos los adornos de presentación (carta boca abajo / destroy). */
    destroyPresentation() {
        const kill = (ref) => { if (ref && ref.scene) ref.destroy(); };
        kill(this.cardFrame); this.cardFrame = null;
        kill(this.shadow); this.shadow = null;
        kill(this.levelPlate); this.levelPlate = null;
        kill(this.levelPlateText); this.levelPlateText = null;
        kill(this.elementSeal); this.elementSeal = null;
        kill(this.elementSealText); this.elementSealText = null;
        if (this.selectedTween) { this.selectedTween.stop(); this.selectedTween = null; }
        kill(this.selectedGlow); this.selectedGlow = null;
    }

    /** Mantiene marco, placa, sello, sombra y resplandor alineados con la carta. */
    syncPresentation() {
        const cx = this.x;
        const cy = this.y;
        const halfW = this.displayWidth / 2;
        const halfH = this.displayHeight / 2;
        // Escala uniforme relativa al tamaño de referencia del marco (132x180).
        const u = Math.min(this.displayWidth / 132, this.displayHeight / 180);

        if (this.cardFrame && this.cardFrame.scene) {
            this.cardFrame.setPosition(cx, cy);
            this.cardFrame.setDisplaySize(this.displayWidth + 14, this.displayHeight + 14);
            this.cardFrame.setDepth(this.depth - 0.2);
            this.cardFrame.setVisible(this.visible);
            this.cardFrame.setAlpha(this.alpha);
        }
        if (this.shadow && this.shadow.scene) {
            this.shadow.setPosition(cx, cy + 12);
            this.shadow.setDisplaySize(this.displayWidth * 1.25, this.displayHeight * 1.05);
            this.shadow.setDepth(this.depth - 0.6);
            this.shadow.setVisible(this.visible);
            this.shadow.setAlpha(this.alpha * 0.5);
        }
        if (this.levelPlate && this.levelPlate.scene) {
            this.levelPlate.setPosition(cx, cy + halfH - 11);
            this.levelPlate.setScale(u);
            this.levelPlate.setDepth(this.depth + 1.2);
            this.levelPlate.setVisible(this.visible);
            this.levelPlate.setAlpha(this.alpha);
        }
        if (this.levelPlateText && this.levelPlateText.scene) {
            this.levelPlateText.setPosition(cx, cy + halfH - 11);
            this.levelPlateText.setScale(u);
            this.levelPlateText.setDepth(this.depth + 1.3);
            this.levelPlateText.setVisible(this.visible);
            this.levelPlateText.setAlpha(this.alpha);
        }
        if (this.elementSeal && this.elementSeal.scene) {
            const sx = cx + halfW - 13;
            const sy = cy - halfH + 13;
            this.elementSeal.setPosition(sx, sy);
            this.elementSeal.setScale(u);
            this.elementSeal.setDepth(this.depth + 1.2);
            this.elementSeal.setVisible(this.visible);
            this.elementSeal.setAlpha(this.alpha * 0.95);
            if (this.elementSealText && this.elementSealText.scene) {
                this.elementSealText.setPosition(sx, sy);
                this.elementSealText.setScale(u);
                this.elementSealText.setDepth(this.depth + 1.3);
                this.elementSealText.setVisible(this.visible);
                this.elementSealText.setAlpha(this.alpha);
            }
        }
        if (this.selectedGlow && this.selectedGlow.scene) {
            this.selectedGlow.setPosition(cx, cy);
            this.selectedGlow.setDisplaySize(this.displayWidth * 1.7, this.displayHeight * 1.5);
            this.selectedGlow.setDepth(this.depth - 0.5);
            this.selectedGlow.setVisible(this.visible);
        }
    }

    /**
     * Activa o desactiva el resplandor pulsante de carta seleccionada.
     * Es solo presentación: no altera posición ni escala (eso lo coordina
     * la escena), para no interferir con sus tweens.
     * @param {boolean} active
     */
    setSelectedVisual(active) {
        this.isSelected = !!active;
        if (!this.selectedGlow || !this.selectedGlow.scene) return;
        this.scene.tweens.killTweensOf(this.selectedGlow);
        if (active) {
            this.scene.tweens.add({
                targets: this.selectedGlow,
                alpha: { from: 0.30, to: 0.60 },
                duration: 640,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else {
            this.scene.tweens.add({
                targets: this.selectedGlow,
                alpha: 0,
                duration: 160,
                ease: 'Power1'
            });
        }
    }

    /**
     * Muestra la gema distintiva de las cartas de nivel 3 en la esquina
     * inferior derecha de la carta. Idempotente: solo se crea una vez.
     */
    addGemBadge() {
        if (this.gemBadge || this.level !== 3) return;
        this.gemBadge = createGemVisual(this.scene, this.x, this.y, this.type, 15, { depth: this.depth + 1 });
        this.syncGemBadge();
    }

    /**
     * Mantiene el distintivo de gema pegado a la esquina inferior derecha de
     * la carta para que siga cualquier animación de la carta.
     */
    syncGemBadge() {
        const badge = this.gemBadge;
        if (!badge || !badge.scene) return;
        const halfW = this.displayWidth / 2;
        const halfH = this.displayHeight / 2;
        badge.setPosition(this.x + halfW - 11, this.y + halfH - 11);
        badge.setScale(this.scaleX, this.scaleY);
        badge.setDepth(this.depth + 1.1);
        badge.setVisible(this.visible);
        badge.setAlpha(this.alpha);
    }

    /**
     * Añade un aura/resplandor sagrado del color del elemento por debajo de la
     * carta. Es puramente decorativo (refuerza la identidad elemental en el
     * campo) y se sincroniza con cada animación de la carta. Idempotente.
     * @param {number} color Color del elemento (0xRRGGBB).
     */
    attachAura(color) {
        if (this.aura || !this.scene || !this.scene.add) return;
        ensureFxTextures(this.scene);
        if (!this.scene.textures.exists('fx-glow')) return;
        this.aura = this.scene.add.image(this.x, this.y, 'fx-glow')
            .setTint(color)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale((this.displayWidth || 110) / 110 * 1.05)
            .setAlpha(0.28);
        this.syncAura();
    }

    /**
     * Mantiene el aura pegada a la carta (posición, escala, opacidad,
     * profundidad) por debajo del sprite.
     */
    syncAura() {
        const aura = this.aura;
        if (!aura || !aura.scene) return;
        aura.setPosition(this.x, this.y);
        aura.setScale(((this.displayWidth || 110) / 110) * 1.05, ((this.displayHeight || 158) / 158) * 1.05);
        aura.setDepth(this.depth - 0.5);
        aura.setVisible(this.visible);
        aura.setAlpha(this.alpha * 0.28);
    }

    /**
     * Se invoca automáticamente cada frame (Update List de Phaser).
     * @param {number} time
     * @param {number} delta
     */
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.syncGemBadge();
        this.syncAura();
        this.syncPresentation();
    }

    /**
     * Destruye también el distintivo de gema, el aura y los adornos de
     * presentación para no dejar huérfanos.
     */
    destroy(fromScene) {
        if (this.gemBadge) {
            const badge = this.gemBadge;
            this.gemBadge = null;
            if (badge.scene) badge.destroy();
        }
        if (this.aura) {
            const aura = this.aura;
            this.aura = null;
            if (aura.scene) aura.destroy();
        }
        this.destroyPresentation();
        super.destroy(fromScene);
    }

    /**
     * Sube el nivel de la carta. Se usa durante la fusión.
     */
    levelUp() {
        if (this.level < 3) {
            this.level++;
            // Actualiza la textura si la carta ya está revelada
            if (!this.isFaceDown) {
                const textureName = `card-${this.type}-${this.level}`;
                this.setTexture(textureName);
            }
        }
        this.refreshPresentation();
        if (!this.isFaceDown && this.level === 3) this.addGemBadge();
    }
}