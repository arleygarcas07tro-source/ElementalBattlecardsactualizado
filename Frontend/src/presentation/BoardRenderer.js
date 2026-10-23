import Phaser from 'phaser';
import { calculateRowPositions } from '../helpers/zone';
import { playFusionFx, playImpactFx, playDeathFx, playFireworksFx, TYPE_COLORS } from '../helpers/cardFx';
import { drawHandTray, ornateLabel } from '../helpers/battlefieldArt.js';
import Card from '../game_objects/card.js';

/**
 * Presentación del tablero de batalla.
 *
 * Responsabilidad agregada: concentrar la creación y actualización de los
 * objetos visuales de Phaser (slots, manos, mazos, decoración del campo,
 * revelados y efectos) fuera de la escena. No contiene reglas de juego: recibe
 * los datos del modelo (manos, contadores, cartas) y solo pinta. La escena y
 * las demás clases de presentación consumen esta API.
 */
export default class BoardRenderer {
    /**
     * @param {object} ctx Contexto compartido de la partida (scene, match, players...).
     * @param {object} sizes
     * @param {{width:number,height:number}} sizes.hand
     * @param {{width:number,height:number}} sizes.field
     */
    constructor(ctx, { hand, field }) {
        this.ctx = ctx;
        this.scene = ctx.scene;
        this.cardHandSize = hand;
        this.cardFieldSize = field;
        this.fx = { playFusionFx, playImpactFx, playDeathFx, playFireworksFx, TYPE_COLORS };
    }

    /**
     * Objetos visuales de cartas presentes en el campo de batalla.
     * @returns {object[]}
     */
    fieldCards() {
        return this.scene.children.list.filter(c => c.getData('isCardOnField'));
    }

    // Decoración visual del campo de batalla (solo presentación, sin lógica).
    // Capa futbolística: tablero de piedra oscura con viñeta, energía naranja
    // (oponente) / azul (jugador), emblema central dorado, marcos ornamentales
    // y runas de cristal. Todo se agrupa en this.scene.fieldDecor (bajo las cartas).
    createFieldDecor() {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const CX = W / 2;
        const CY = H / 2;
        const GOLD = 0xd9b75b;
        const GOLD_BRIGHT = 0xf5d98c;
        const ORANGE = 0xff7a3d;
        const BLUE = 0x4fb3ff;

        const container = this.scene.add.container(0, 0).setDepth(-0.4);
        this.scene.fieldDecor = container;

        const diamondPts = (x, y, r) => [
            new Phaser.Geom.Point(x, y - r),
            new Phaser.Geom.Point(x + r, y),
            new Phaser.Geom.Point(x, y + r),
            new Phaser.Geom.Point(x - r, y)
        ];

        // Viñeta oscura más limpia
        container.add(this.scene.add.rectangle(CX, CY, W, H, 0x050510, 0.12));

        // Banda central sutil
        const centerBand = this.scene.add.graphics();
        centerBand.fillStyle(0x151826, 0.18).fillRoundedRect(CX - W * 0.42, CY - 26, W * 0.84, 52, 26);
        centerBand.lineStyle(2, GOLD, 0.28).strokeRoundedRect(CX - W * 0.42, CY - 26, W * 0.84, 52, 26);
        container.add(centerBand);

        // Líneas de campo minimalistas
        const lineG = this.scene.add.graphics();
        lineG.lineStyle(2, GOLD, 0.16).lineBetween(CX - W * 0.38, CY, CX + W * 0.38, CY);
        lineG.lineStyle(1, GOLD, 0.12).strokeCircle(CX, CY, 52);
        lineG.lineStyle(1, GOLD, 0.1).strokeCircle(CX, CY, 92);
        container.add(lineG);

        // Franjas de energía más sutiles
        const beam = (y, color) => {
            const g = this.scene.add.graphics();
            g.fillStyle(color, 0.05).fillRect(0, y - 48, W, 96);
            g.fillStyle(color, 0.08).fillRect(0, y - 22, W, 44);
            g.lineStyle(2, color, 0.26).lineBetween(0, y, W, y);
            return g;
        };
        const opponentFieldY = H * 0.45 - 72;
        const playerFieldY = H * 0.55 + 72;
        container.add(beam(opponentFieldY, ORANGE));
        container.add(beam(playerFieldY, BLUE));

        // Emblema central más compacto
        const emblem = this.scene.add.graphics();
        emblem.lineStyle(1, GOLD, 0.24).strokeCircle(CX, CY, 64);
        emblem.save().translateCanvas(CX, CY).rotateCanvas(Math.PI / 4);
        emblem.lineStyle(2, GOLD, 0.38).strokeRect(-36, -36, 72, 72);
        emblem.lineStyle(2, GOLD_BRIGHT, 0.5).strokeRect(-24, -24, 48, 48);
        emblem.fillStyle(GOLD, 0.08).fillRect(-24, -24, 48, 48);
        emblem.restore();
        emblem.fillStyle(GOLD, 0.16).fillCircle(CX, CY, 14);
        emblem.fillStyle(GOLD_BRIGHT, 0.9).fillCircle(CX, CY, 4);
        container.add(emblem);

        // Marcos más limpios
        const frameRow = (yCenter) => {
            const positions = calculateRowPositions({ numItems: 6, itemWidth: 118, itemSpacing: 38, containerWidth: W });
            const left = Math.min(...positions) - 86;
            const right = Math.max(...positions) + 86;
            const top = yCenter - 72;
            const height = 144;
            const g = this.scene.add.graphics();
            g.lineStyle(2, GOLD, 0.32).strokeRoundedRect(left, top, right - left, height, 18);
            g.lineStyle(1, GOLD, 0.16).strokeRoundedRect(left + 8, top + 8, right - left - 16, height - 16, 14);
            const corners = [[left, top], [right, top], [left, top + height], [right, top + height]];
            corners.forEach(([x, y]) => {
                g.fillStyle(GOLD_BRIGHT, 0.8);
                g.fillPoints(diamondPts(x, y, 5), true);
            });
            return g;
        };
        container.add(frameRow(opponentFieldY));
        container.add(frameRow(playerFieldY));

        // Runas discretas
        const rune = (x, y, color, r = 6) => {
            const g = this.scene.add.graphics();
            g.fillStyle(color, 0.12).fillCircle(x, y, r * 2.6);
            g.fillStyle(color, 0.9);
            g.fillPoints(diamondPts(x, y, r), true);
            return g;
        };

        const battlePositions = calculateRowPositions({ numItems: 6, itemWidth: 118, itemSpacing: 38, containerWidth: W });
        const leftEdge = Math.min(...battlePositions) - 86;
        const rightEdge = Math.max(...battlePositions) + 86;

        container.add(rune(leftEdge + 14, opponentFieldY, ORANGE));
        container.add(rune(rightEdge - 14, opponentFieldY, ORANGE));
        container.add(rune(leftEdge + 14, playerFieldY, BLUE));
        container.add(rune(rightEdge - 14, playerFieldY, BLUE));
    }

    // Crear fila de slots
    createSlotsRow(y, name, numSlots = 4) { // Por defecto crea 4 slots
        const slots = [];
        const slotWidth = 110; // Ancho reducido para 1280px
        const slotSpacing = 35; // Espacio reducido
        const positionsX = calculateRowPositions({
            numItems: numSlots,
            itemWidth: slotWidth,
            itemSpacing: slotSpacing,
            containerWidth: this.scene.scale.width
        });

        for (let i = 0; i < numSlots; i++) {
            let slot = this.scene.add.image(positionsX[i], y, 'slot')
                .setScale(0.25) // Escala reducida
                .setAlpha(0.6)
                .setName(`${name}-${i}`); // Asignamos un nombre único para identificarlo

            // Si es un slot del campo de batalla del jugador, lo hacemos una zona de drop
            if (name === 'player_battle_slots') {
                slot.setInteractive({ dropZone: true }); // CORRECCIÓN: Aseguramos que sea dropzone
                // Le añadimos un listener para cuando se haga clic en él
                slot.on('pointerdown', () => {
                    this.ctx.interaction.onSlotClicked(slot);
                });
            } else if (name === 'opponent_battle_slots') {
                // Hacemos que los slots del oponente sean interactivos para poder hacerles clic.
                slot.setInteractive().on('pointerdown', () => {
                    this.ctx.interaction.onOpponentSlotClicked(slot);
                });
            }

            slots.push(slot);
        }

        this.scene[name] = slots;
    }

    // Crear fila de cartas
    createCardsRow(y, name, hand) {
        const cards = [];
        const numCards = hand.length;
        const cardWidth = 110; // Ancho reducido
        const cardSpacing = 35; // Espacio reducido
        const positionsX = calculateRowPositions({
            numItems: numCards,
            itemWidth: cardWidth,
            itemSpacing: cardSpacing,
            containerWidth: this.scene.scale.width
        });

        for (let i = 0; i < numCards; i++) {
            const cardData = hand[i];

            let card;
            if (name === 'player-cards') {
                card = this.createPlayerCard(positionsX[i], y, cardData);
            } else {
                card = this.createOpponentCard(positionsX[i], y, cardData);
            }

            cards.push(card);
        }

        this.scene[name] = cards;
    }

    // Crear carta del jugador
    createPlayerCard(x, y, cardData) {
        const card = new Card(this.scene, x, y, cardData, false); // Crear la carta en su posición final
        card.setDisplaySize(this.cardHandSize.width, this.cardHandSize.height); // Tamaño unificado
        card.setData('startPosition', { x, y });
        card.setData('isRevealed', false);
        card.setData('isCardOnField', false);
        card.on('pointerdown', () => this.ctx.interaction.onCardClicked(card));

        return card;
    }

    // Crear carta del oponente
    createOpponentCard(x, y, cardData) {
        const card = new Card(this.scene, x, y, cardData, true);
        // Normalizamos el tamaño visual del reverso a tamaño de mano (evita que backs nativos grandes se vean enormes)
        card.setDisplaySize(this.cardHandSize.width, this.cardHandSize.height); // Tamaño unificado
        card.setData('isOpponentCard', true);
        card.setData('isRevealed', false); // siempre boca abajo al colocarse en campo
        return card;
    }

    /**
     * Helper: crear una carta visual en un slot del campo y normalizar su visual.
     * @param {object} slotObj - El objeto slot con propiedades x,y
     * @param {object} cardData - Datos de la carta del modelo
     * @param {object} options - { isOpponent: bool, revealed: bool, fieldIndex: number }
     * @returns {Card} objeto visual creado
     */
    createFieldCard(slotObj, cardData, options = {}) {
        const { isOpponent = false, revealed = false, fieldIndex = null } = options;
        const cardObj = new Card(this.scene, slotObj.x, slotObj.y, cardData, isOpponent);
        cardObj.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);
        if (isOpponent) cardObj.setData('isOpponentCard', true);
        // Aseguramos que la vista tenga la misma referencia de datos y metadata de instancia
        cardObj.setData('cardData', cardData);
        if (cardData && cardData.instanceId) {
            try { cardObj.setName(cardData.instanceId); } catch (e) {}
            try { cardObj.setData('instanceId', cardData.instanceId); } catch (e) {}
        }
        cardObj.setData('isCardOnField', true);
        if (fieldIndex !== null && typeof fieldIndex !== 'undefined') cardObj.setData('fieldIndex', fieldIndex);
        cardObj.setData('isRevealed', !!revealed);
        cardObj.setData('startPosition', { x: slotObj.x, y: slotObj.y });
        cardObj.on('pointerdown', () => this.ctx.interaction.onCardClicked(cardObj));
        return cardObj;
    }

    /**
     * Helper: crear una carta visual en coordenadas dadas (útil para fusiones que usan posiciones previas).
     */
    createFieldCardAt(x, y, cardData, options = {}) {
        const dummySlot = { x, y };
        return this.createFieldCard(dummySlot, cardData, options);
    }

    // Crear mazo y cementerio
    createDecks(playerCount, opponentCount) {
        const { width, height } = this.scene.scale;

        // Definimos un estilo y un padding para los contadores.
        const textStyle = {
            fontSize: '24px',
            color: '#fff',
            fontStyle: 'bold',
            stroke: '#000000', // Contorno negro
            strokeThickness: 5 // Grosor del contorno
        };
        const padding = 5; // Pequeño espacio desde el borde.

        // Mazo del jugador
        const playerDeckImage = this.scene.add.image(width - 120, height - 290, 'card-back-player').setScale(0.185);
        const playerDeckBounds = playerDeckImage.getBounds();
        this.scene.playerDeckText = this.scene.add.text(playerDeckBounds.left + padding, playerDeckBounds.bottom - padding, playerCount, textStyle)
            .setOrigin(0, 1); // Anclaje en la esquina inferior izquierda.

        // Mazo del oponente
        // Corregido y asegurado: Se crea como una imagen simple, sin interactividad.
        // Se elimina cualquier posibilidad de que se le asigne un listener de clic por error.
        const opponentDeckImage = this.scene.add.image(120, 290, 'card-back-opponent').setScale(0.185);
        const opponentDeckBounds = opponentDeckImage.getBounds();
        this.scene.opponentDeckText = this.scene.add.text(opponentDeckBounds.left + padding, opponentDeckBounds.bottom - padding, opponentCount, textStyle)
            .setOrigin(0, 1); // Anclaje en la esquina inferior izquierda.
    }

    // Actualizar contadores de mazos
    updateDeckCounts(playerCount, opponentCount) {
        this.scene.playerDeckText.setText(playerCount);
        this.scene.opponentDeckText.setText(opponentCount);
        console.log('Contadores de mazo actualizados.');
    }

    /**
     * Destruye las cartas actuales de la mano del jugador y las vuelve a crear.
     * Es útil para cuando la mano cambia (robar, descartar, etc.).
     * @param {object[]} hand Mano actual del modelo.
     */
    refreshPlayerHand(hand) {
        // 1. Destruimos los objetos visuales de las cartas que quedaban en la mano
        if (this.scene['player-cards']) {
            this.scene['player-cards'].forEach(card => card.destroy());
        }

        // 2. Volvemos a crear la fila de cartas con los datos actualizados del modelo
        this.createCardsRow(this.scene.scale.height * 0.83, 'player-cards', hand);
        console.log('Mano del jugador refrescada.');
    }

    /**
     * Destruye y vuelve a crear las cartas en la mano del oponente.
     * Útil para mantener la consistencia visual cuando roba una carta.
     * @param {object[]} hand Mano actual del modelo rival.
     */
    refreshOpponentHand(hand) {
        // 1. Destruimos los objetos visuales existentes
        if (this.scene['opponent-cards']) {
            this.scene['opponent-cards'].forEach(card => card.destroy());
        }

        // 2. Volvemos a crear la fila con los datos actualizados
        this.createCardsRow(this.scene.scale.height * 0.18, 'opponent-cards', hand);
    }

    /**
     * Revela una carta del jugador. Aunque visualmente ya lo está,
     * esta función asegura que el flag 'isRevealed' esté activo para la IA.
     * @param {Card} cardObject La carta del jugador a revelar.
     */
    revealPlayerCard(cardObject) {
        if (!cardObject || cardObject.getData('isRevealed')) {
            return;
        }
        const cardData = cardObject.getData('cardData') || cardObject.cardData;
        console.log('[GameScene] Carta del jugador revelada', { cardId: cardData && cardData.id, type: cardData && cardData.type, level: cardData && cardData.level, cause: 'ataque/fusión' });
        cardObject.setData('isRevealed', true);
        // Si el objeto muestra textura de back, cambiar por la frontal
        if (cardObject.setTexture && cardData) {
            const textureName = `card-${cardData.type}-${cardData.level}`;
            cardObject.setTexture(textureName);
            // Asegurar que la textura frontal pinta exactamente al tamaño del slot
            cardObject.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);
        }
    }

    /**
     * Revela una carta del oponente, cambiando su textura y aplicando una animación.
     * @param {Card} cardObject La carta del oponente a revelar.
     */
    revealOpponentCard(cardObject) {
        // Si la carta no existe o ya fue revelada, no hacemos nada.
        if (!cardObject || cardObject.getData('isRevealed')) {
            return;
        }

        const cardData = cardObject.getData('cardData');
        const textureName = `card-${cardData.type}-${cardData.level}`;

        console.log('[GameScene] Revelando carta del oponente', { cardId: cardData.id, type: cardData.type, level: cardData.level });

        // Marcamos la carta como revelada para no volver a hacerlo.
        cardObject.setData('isRevealed', true);

        // Animación de revelación: un rápido encogimiento y expansión para simular un "giro".
        this.scene.tweens.add({
            targets: cardObject,
            scaleX: 0, // Encogemos en el eje X hasta 0
            scaleY: cardObject.scaleY * 1.1, // La hacemos un poco más alta para el efecto
            duration: 100,
            ease: 'Power1',
            onComplete: () => {
                cardObject.setTexture(textureName); // Cambiamos la textura justo a la mitad de la animación

                // --- ¡CORRECCIÓN CLAVE! ---
                // Primero, forzamos el tamaño visual correcto con la nueva textura.
                // Esto recalcula internamente las escalas necesarias.
                cardObject.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);

                // Luego, animamos la expansión de vuelta a su escala correcta (la que calculó setDisplaySize).
                // En lugar de animar a '1', animamos al valor de escala que ya tiene el objeto.
                this.scene.tweens.add({
                    targets: cardObject,
                    scaleX: cardObject.scaleX, // Restauramos la escala X correcta
                    scaleY: cardObject.scaleY, // Restauramos la escala Y correcta
                    duration: 100, ease: 'Power1' });
            }
        });
    }

    /**
     * Poder LUZ (Clarividencia): revela visualmente la mano del rival. Las cartas
     * vuelven a su reverso la próxima vez que el rival robe o juegue (refresh).
     */
    revealOpponentHandForTurn() {
        const opponentCards = this.scene['opponent-cards'] || [];
        let revealed = 0;
        opponentCards.forEach(cardObj => {
            const cd = (cardObj.getData && cardObj.getData('cardData')) || cardObj.cardData;
            if (!cd) return;
            try { cardObj.setTexture(`card-${cd.type}-${cd.level}`); } catch (e) {}
            cardObj.setData('isRevealed', true);
            revealed++;
        });
        console.log(`[GameScene] Clarividencia: mano del rival revelada (${revealed} carta(s)).`);
    }

    /**
     * Encuentra el objeto visual de una carta en el campo a partir de su índice.
     * @param {number} fieldIndex El índice de la carta en el campo.
     * @param {Card} [excludeObject=null] Un objeto a excluir de la búsqueda.
     * @returns {Card|null}
     */
    findCardObjectOnField(fieldIndex, excludeObject = null) {
        // Simplificamos la búsqueda para que sea más directa y fiable.
        return this.scene.children.list.find(child =>
            child.getData('isCardOnField') &&

            child.getData('fieldIndex') === fieldIndex
        );
    }

    /**
     * Reproduce el efecto de fusión entre dos cartas visuales.
     * @param {object} params
     * @param {Card} params.sourceCard
     * @param {Card} params.targetCard
     * @param {string} params.type
     * @param {Function} onComplete
     */
    playFusion(params, onComplete) {
        this.fx.playFusionFx(this.scene, params, onComplete);
    }

    /**
     * Reproduce los fuegos artificiales de una carta fusionada.
     */
    playFireworks(x, y, type) {
        this.fx.playFireworksFx(this.scene, x, y - 10, this.fx.TYPE_COLORS[type] || 0xffffff);
    }

    /**
     * Reproduce el impacto de un ataque en una posición.
     */
    playImpact(x, y, color) {
        this.fx.playImpactFx(this.scene, x, y, color);
    }

    /**
     * Reproduce el efecto de muerte de una carta.
     */
    playDeath(cardObject, cardData, onComplete) {
        this.fx.playDeathFx(this.scene, cardObject, cardData, onComplete);
    }

    /** Color asociado a un tipo de carta para los efectos. */
    typeColor(type) {
        return this.fx.TYPE_COLORS[type] || 0xffffff;
    }

    /**
     * Bandejas ornamentadas bajo las manos para integrarlas con la arena.
     * Responsabilidad agregada: presentación de los soportes de mano; no
     * altera lógica ni eventos.
     */
    createHandTrays() {
        const { width, height } = this.scene.scale;

        if (this.scene.playerHandTray) this.scene.playerHandTray.destroy();
        if (this.scene.opponentHandTray) this.scene.opponentHandTray.destroy();

        this.scene.playerHandTray = drawHandTray(this.scene, width / 2, height * 0.875, 1560, 190, 'player')
            .setDepth(-0.3);
        this.scene.opponentHandTray = drawHandTray(this.scene, width / 2, height * 0.155, 1300, 150, 'opponent')
            .setDepth(-0.3);

        if (this.scene.playerHandLabel) this.scene.playerHandLabel.destroy();
        if (this.scene.opponentHandLabel) this.scene.opponentHandLabel.destroy();
        this.scene.playerHandLabel = ornateLabel(this.scene, 210, height - 60, 'TU MANO', {
            fontSize: '13px', color: '#bfe1ff', letterSpacing: 3
        }).setDepth(-0.2);
        this.scene.opponentHandLabel = ornateLabel(this.scene, 230, 250, 'MANO RIVAL', {
            fontSize: '13px', color: '#ffc2ad', letterSpacing: 3
        }).setDepth(-0.2);
    }
}
