import { calculateRowPositions } from '../helpers/zone';
import { playFusionFx, playImpactFx, playDeathFx, playFireworksFx, TYPE_COLORS } from '../helpers/cardFx';
import {
    SLOT_W,
    SLOT_GAP,
    drawHandTray
} from '../helpers/battlefieldArt.js';
import Card from '../game_objects/card.js';

/**
 * Presentación del tablero de batalla.
 *
 * Responsabilidad agregada: concentrar la creación y actualización de los
 * objetos visuales de Phaser (zonas invisibles de juego, manos, revelados y
 * efectos) fuera de la escena. No contiene reglas de juego: recibe los datos
 * del modelo (manos, contadores, cartas) y solo pinta. La escena y las demás
 * clases de presentación consumen esta API.
 */
export default class BoardRenderer {
    /**
     * @param {object} ctx Contexto compartido de la partida (scene, match, players...).
     * @param {object} sizes
     * @param {{width:number,height:number}} sizes.hand
     * @param {{width:number,height:number}} sizes.field
     */
    constructor(ctx, { hand, field, opponentHand, layout } = {}) {
        this.ctx = ctx;
        this.scene = ctx.scene;
        this.cardHandSize = hand || (ctx.scene.cardHandSize);
        this.cardOpponentHandSize = opponentHand || ctx.scene.cardOpponentHandSize || this.cardHandSize;
        this.cardFieldSize = field || ctx.scene.cardFieldSize;
        this.layout = layout || ctx.scene.layout || {
            opponentHandY: this.scene.scale.height * 0.196,
            playerHandY: this.scene.scale.height * 0.842,
            opponentFieldY: this.scene.scale.height * 0.45 - 70,
            playerFieldY: this.scene.scale.height * 0.55 + 70
        };
        this.fx = { playFusionFx, playImpactFx, playDeathFx, playFireworksFx, TYPE_COLORS };
    }

    /**
     * Prepara las bandejas ornamentales de ambas manos. Debe llamarse una vez,
     * tras crear la arena y antes de dibujar las cartas.
     * Responsabilidad agregada: dar soporte físico a las manos sin tocar las
     * zonas invisibles de interacción ni la lógica de la partida.
     */
    createBoardDecor() {
        const cx = this.scene.scale.width / 2;
        const px = this.layout.px || ((value) => value);

        const handGap = this.layout.handGap || 16;
        const trayWOpp = Math.round((this.cardOpponentHandSize.width * 4 + handGap * 3 + px(72)));
        const trayWOppH = Math.round(this.cardOpponentHandSize.height + px(22));
        const opponentTray = drawHandTray(this.scene, cx, this.layout.opponentHandY, trayWOpp, trayWOppH, 'opponent')
            .setDepth(-0.35);
        opponentTray.setName('board-decor-opponent-tray');

        const trayWPlayer = Math.round((this.cardHandSize.width * 4 + handGap * 3 + px(80)));
        const trayWPlayerH = Math.round(this.cardHandSize.height + px(24));
        const playerTray = drawHandTray(this.scene, cx, this.layout.playerHandY, trayWPlayer, trayWPlayerH, 'player')
            .setDepth(-0.35);
        playerTray.setName('board-decor-player-tray');

        return { opponentTray, playerTray };
    }

    /**
     * Objetos visuales de cartas presentes en el campo de batalla.
     * @returns {object[]}
     */
    fieldCards() {
        return this.scene.children.list.filter(c => c.getData('isCardOnField'));
    }

    // Crear fila de slots
    createSlotsRow(y, name, numSlots = 4) { // Por defecto crea 4 slots
        const slots = [];
        const isField = name.startsWith('player_battle_slots') || name.startsWith('opponent_battle_slots');
        const isOpponent = name.startsWith('opponent');
        const cardSize = isField ? this.cardFieldSize : (isOpponent ? this.cardOpponentHandSize : this.cardHandSize);
        const slotWidth = isField ? this.cardFieldSize.width : SLOT_W;
        const slotSpacing = isField ? (this.layout.fieldGap || SLOT_GAP) : SLOT_GAP;
        const positionsX = calculateRowPositions({
            numItems: numSlots,
            itemWidth: slotWidth,
            itemSpacing: slotSpacing,
            containerWidth: this.scene.scale.width
        });

        for (let i = 0; i < numSlots; i++) {
            const slot = this.scene.add.image(positionsX[i], y, 'slot')
                .setDisplaySize(cardSize.width, cardSize.height)
                .setAlpha(0.001) // Solo zona de interacción: sin marco visible
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
        const isPlayerHand = name === 'player-cards';
        const size = isPlayerHand ? this.cardHandSize : this.cardOpponentHandSize;
        const cardSpacing = numCards > 1 ? (this.layout.handGap || 16) : 0;
        const positionsX = calculateRowPositions({
            numItems: numCards,
            itemWidth: size.width,
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
        // Normalizamos el tamaño visual del reverso a tamaño de mano (evita que los backs nativos grandes se vean enormes)
        card.setDisplaySize(this.cardOpponentHandSize.width, this.cardOpponentHandSize.height); // Tamaño unificado
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
            try { cardObj.setName(cardData.instanceId); } catch {}
            try { cardObj.setData('instanceId', cardData.instanceId); } catch {}
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

    // Actualizar contadores de mazos (el HUD muestra el total; el tablero ya no
    // dibuja mazos físicos).
    updateDeckCounts(playerCount, opponentCount) {
        if (this.scene.playerDeckText) this.scene.playerDeckText.setText(playerCount);
        if (this.scene.opponentDeckText) this.scene.opponentDeckText.setText(opponentCount);
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
        this.createCardsRow(this.layout.playerHandY, 'player-cards', hand);
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
        this.createCardsRow(this.layout.opponentHandY, 'opponent-cards', hand);
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
            try { cardObj.setTexture(`card-${cd.type}-${cd.level}`); } catch {}
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
            child !== excludeObject &&
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

}
