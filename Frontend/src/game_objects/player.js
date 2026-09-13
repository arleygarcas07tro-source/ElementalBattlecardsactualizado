import Deck from './deck.js';
import Card from './card.js'; // CORRECCIÓN: Solo se importa el default, no 'CardTypes'
import { CardDefinitions } from './card-definitions.js';
import EssenceManager from './essences.js';
import CardDestructionService from '../game/CardDestructionService.js';
import Battlefield from '../game/Battlefield.js';

/**
 * Gestiona el estado completo de un jugador, incluyendo su mazo, mano, campo,
 * cementerio y esencias.
 */
export default class Player {
    /**
     * @param {string} id El identificador del jugador ('player1' o 'player2').
     * @param {Phaser.Scene} scene La escena principal del juego.
     */
    constructor(id, scene) {
        this.id = id;
        this.scene = scene;

        this.deck = new Deck(id);
        this.essences = new EssenceManager();

        /** @type {Card[]} */
        this.hand = [];

        /** @type {import('../game/Battlefield.js').default} Campo de batalla: 6 slots gestionados por Battlefield. */
        this.field = new Battlefield();

        /** @type {object[]} */
        this.graveyard = []; // Guardaremos los datos de las cartas, no los sprites

        this.turnsWithoutAttacking = 0;
    }

    /**
     * Roba la mano inicial de 4 cartas.
     */
    drawInitialHand() {
        for (let i = 0; i < 4; i++) {
            this.drawCard();
        }
    }

    /**
     * Roba una carta del mazo y la añade a la mano.
     * @returns {object|null} Los datos de la carta robada o null.
     */
    drawCard() {
        if (this.deck.getCardsCount() === 0) {
            if (this.graveyard.length === 0) {
                console.log(`${this.id} no tiene cartas en el mazo ni en el cementerio.`);
                return null; // No hay más cartas en el juego
            }
            this.refillDeckFromGraveyard();
        }

        const cardData = this.deck.draw();
        if (cardData) {
            // En lugar de crear el sprite aquí, lo añadimos a la mano como datos.
            // La escena se encargará de crear el sprite cuando sea necesario mostrarlo.
            // --- ¡AQUÍ ESTÁ LA CORRECCIÓN CLAVE! ---
            // Asignamos un ID de instancia único en el momento en que la carta entra en la mano.
            // Esto nos permite rastrearla de forma única a lo largo de todo su ciclo de vida.
            cardData.instanceId = Phaser.Math.RND.uuid();
            this.hand.push(cardData);
        }
        return cardData;
    }

    /**
     * Mueve las cartas del cementerio de vuelta al mazo y lo baraja.
     */
    refillDeckFromGraveyard() {
        console.log(`${this.id} está barajando su cementerio en el mazo.`);
        this.deck.cards.push(...this.graveyard);
        this.graveyard = [];
        this.deck.shuffle();
    }

    /**
     * Mueve una carta de la mano a un slot específico del campo de batalla.
     * @param {string} instanceId El ID de instancia único de la carta a jugar.
     * @param {number} fieldIndex El índice del slot en el campo (0-5).
     * @returns {Card|null} La carta jugada o null si no se pudo.
     */
    playCardFromHand(instanceId, fieldIndex) {
        if (this.scene && this.scene.debugSync) {
            console.log('[Player][debug] playCardFromHand called', { player: this.id, instanceId, fieldIndex, handIds: this.hand.map(h => h && h.instanceId), fieldIds: this.field.snapshot().map(f => f && f.instanceId), timestamp: Date.now() });
        }
        const cardIndex = this.hand.findIndex(card => card.instanceId === instanceId);
        if (cardIndex > -1 && this.field.isEmpty(fieldIndex)) {
            const cardToPlay = this.hand.splice(cardIndex, 1)[0]; // Saca la carta de la mano

            this.field.set(fieldIndex, cardToPlay); // Coloca la nueva instancia en el campo
            if (this.scene && this.scene.debugSync) console.log(`[Player][debug] Carta movida al slot`, { player: this.id, instanceId: cardToPlay.instanceId, fieldIndex, resultingField: this.field.snapshot().map(f=>f&&f.instanceId) });
            console.log(`[Player] Carta con instanceId ${instanceId} movida al slot ${fieldIndex} del campo.`);
            return cardToPlay;
        }
        console.warn(`[Player] No se pudo jugar la carta con instanceId ${instanceId} en el slot ${fieldIndex}.`);
        return null;
    }

    /**
     * Fusiona dos cartas en el campo.
     * @param {number} draggedIndex El índice de la carta arrastrada.
     * @param {number} targetIndex El índice de la carta objetivo.
     * @returns {{newCard: object, emptiedIndex: number}|null} Un objeto con la nueva carta y el índice del slot vaciado.
     */
    fuseCards(draggedIndex, targetIndex) {
        if (this.scene && this.scene.debugSync) console.log('[Player][debug] fuseCards called', { player: this.id, draggedIndex, targetIndex, fieldSnapshot: this.field.snapshot().map(f=>f&&f.instanceId), timestamp: Date.now() });
        // Validaciones básicas de índices
        if (typeof draggedIndex !== 'number' || typeof targetIndex !== 'number') {
            console.warn('[Player.fuseCards] Índices inválidos:', draggedIndex, targetIndex);
            return null;
        }
        if (draggedIndex < 0 || draggedIndex >= this.field.size || targetIndex < 0 || targetIndex >= this.field.size) {
            console.warn('[Player.fuseCards] Índices fuera de rango:', draggedIndex, targetIndex);
            return null;
        }

        const card1 = this.field.get(draggedIndex);
        const card2 = this.field.get(targetIndex);

        // Comprobar que ambos slots contengan cartas (modelo)
        if (!card1 || !card2) {
            console.warn('[Player.fuseCards] Uno o ambos slots están vacíos. dragged:', card1, 'target:', card2);
            return null;
        }

        // Validaciones de compatibilidad (tipo y nivel)
        if (card1.type !== card2.type || card1.level !== card2.level) {
            console.warn('[Player.fuseCards] Cartas no compatibles para fusión:', card1, card2);
            return null;
        }

        if (card1.level >= 3) {
            console.warn('[Player.fuseCards] Intento de fusionar carta de nivel máximo:', card1);
            return null;
        }

        // Buscamos la definición de la carta de nivel superior en nuestra base de datos.
        const newLevel = card1.level + 1;
        const newCardId = `${card1.type}-${newLevel}`; // Ej: 'sombra-2'
        const newCardData = CardDefinitions[newCardId];

        if (!newCardData) {
            console.error(`[Player] No se encontró la definición para la carta fusionada con ID: ${newCardId}`);
            return null;
        }

        // Creamos una nueva instancia de la carta fusionada.
        const newCardInstance = { ...newCardData, instanceId: Phaser.Math.RND.uuid() };

        // Actualizamos el campo: la nueva carta ocupa el lugar de la carta objetivo.
        // El slot de la carta arrastrada se vacía.
        this.field.set(targetIndex, newCardInstance);
        this.field.clearAt(draggedIndex);

        if (this.scene && this.scene.debugSync) console.log('[Player][debug] fuseCards result', { newCardInstance: newCardInstance.instanceId, targetIndex, emptiedIndex: draggedIndex, fieldAfter: this.field.snapshot().map(f=>f&&f.instanceId) });
        console.log(`Modelo actualizado: Carta ${newCardInstance.id} (Nivel ${newCardInstance.level}) creada en el slot ${targetIndex}`);
        return { newCard: newCardInstance, emptiedIndex: draggedIndex };
    }

    /**
     * Fusiona una carta de la mano con una carta en el campo.
     * @param {string} cardId El ID de la carta en la mano.
     * @param {number} targetIndex El índice de la carta objetivo en el campo.
     * @returns {object|null} Los datos de la nueva carta fusionada o null si falla.
     */
    fuseFromHand(instanceId, targetIndex) {
        if (this.scene && this.scene.debugSync) console.log('[Player][debug] fuseFromHand called', { player: this.id, instanceId, targetIndex, handIds: this.hand.map(h=>h&&h.instanceId), targetFieldId: this.field.get(targetIndex) && this.field.get(targetIndex).instanceId, timestamp: Date.now() });
        const cardFromHandIndex = this.hand.findIndex(c => c.instanceId === instanceId);
        const cardOnField = this.field.get(targetIndex);

        if (cardFromHandIndex === -1 || !cardOnField) return null;

        const cardFromHand = this.hand[cardFromHandIndex];

        // Validación de compatibilidad
        if (cardFromHand.type !== cardOnField.type || cardFromHand.level !== cardOnField.level) {
            return null;
        }

        // Saca la carta de la mano
        this.hand.splice(cardFromHandIndex, 1);

        // Buscamos la definición de la carta de nivel superior.
        const newLevel = cardOnField.level + 1;
        const newCardId = `${cardOnField.type}-${newLevel}`; // Ej: 'fuego-3'
        const newCardData = CardDefinitions[newCardId];

        if (!newCardData) {
            console.error(`[Player] No se encontró la definición para la carta fusionada con ID: ${newCardId}`);
            return null;
        }

        // Regla simétrica con fuseCards: la carta del campo y la de la mano se
        // consumen en la fusionada y NADA va al cementerio. Cuando la carta
        // fusionada muera, CardDestructionService devolverá su material en cartas base.

        const newCardInstance = { ...newCardData, instanceId: Phaser.Math.RND.uuid() };

        // Reemplazamos la carta en el campo con la nueva carta fusionada
        this.field.set(targetIndex, newCardInstance);
        if (this.scene && this.scene.debugSync) console.log('[Player][debug] fuseFromHand result', { newCardInstance: newCardInstance.instanceId, targetIndex, fieldAfter: this.field.snapshot().map(f=>f&&f.instanceId) });
        return newCardInstance;
    }
    /**
     * Llena la esencia de un tipo elemental para este jugador.
     * Si la esencia ya estaba activa, no hace nada y no emite el evento.
     * @param {string} essenceType El tipo de esencia a activar.
     * @returns {boolean} `true` si la esencia se activó ahora, `false` si ya estaba activa.
     */
    fillEssence(essenceType) {
        if (this.essences.has(essenceType)) {
            console.log('[GameScene] Esencia ya activada previamente', { playerId: this.id, essenceType });
            return false;
        }
        this.essences.activate(essenceType);
        console.log('[GameScene] Esencia activada', { playerId: this.id, essenceType, total: this.essences.size });
        // Notificamos a la escena para que la UIScene actualice los orbes.
        if (this.scene && this.scene.events) {
            this.scene.events.emit('essence-activated', this.id, essenceType);
        }
        return true;
    }

    /**
     * Añade los datos de una carta (objeto de datos, no sprite) al cementerio.
     * Delega la descomposición por nivel en CardDestructionService
     * (única fuente de verdad): L1 → 1 base, L2 → 2 bases, L3 → 4 bases.
     * @param {object} cardData Los datos de la carta que ha sido derrotada.
     */
    addCardDataToGraveyard(cardData) {
        const baseCards = CardDestructionService.graveyardEntries(cardData);
        this.graveyard.push(...baseCards);
        console.log(`Añadiendo ${baseCards.length} carta(s) base de tipo ${cardData.type} al cementerio.`);
    }

    /**
     * Poder AGUA (Rescate): devuelve a la mano la carta base (nivel 1) más
     * reciente del cementerio. Asigna un instanceId nuevo, como cualquier robo.
     * @returns {object|null} La carta devuelta a la mano o null si no hay material.
     */
    returnTopGraveyardCardToHand() {
        if (this.graveyard.length === 0) return null;
        const base = this.graveyard.pop();
        const card = { ...base, instanceId: Phaser.Math.RND.uuid() };
        this.hand.push(card);
        console.log(`[Player] Rescate: carta base ${card.type}-${card.level} devuelta a la mano.`);
        return card;
    }

    /**
     * Poder SOMBRA (Robar): el rival debe descartar la carta de mayor nivel de
     * su mano. La carta descartada se descompone en material de cementerio.
     * @returns {object|null} La carta descartada o null si el rival no tiene mano.
     */
    discardHighestLevelCard() {
        if (this.hand.length === 0) return null;
        let idx = 0;
        for (let i = 1; i < this.hand.length; i++) {
            if (this.hand[i].level > this.hand[idx].level) idx = i;
        }
        const discarded = this.hand.splice(idx, 1)[0];
        this.addCardDataToGraveyard(discarded);
        console.log(`[Player] Robar: ${this.id} descartó ${discarded.id} (nivel ${discarded.level}).`);
        return discarded;
    }
}