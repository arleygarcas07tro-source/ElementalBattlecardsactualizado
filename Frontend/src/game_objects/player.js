import Deck from './deck.js';
import Card from './card.js'; // CORRECCIÓN: Solo se importa el default, no 'CardTypes'
import { CardDefinitions } from './card-definitions.js';
import EssenceManager from './essences.js';
import GemManager from '../game/GemManager.js';

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
        this.gems = new GemManager();

        /** @type {Card[]} */
        this.hand = [];

        /** @type {(Card|null)[]} */
        this.field = new Array(6).fill(null); // 6 espacios en el campo

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
            console.log('[Player][debug] playCardFromHand called', { player: this.id, instanceId, fieldIndex, handIds: this.hand.map(h => h && h.instanceId), fieldIds: this.field.map(f => f && f.instanceId), timestamp: Date.now() });
        }
        const cardIndex = this.hand.findIndex(card => card.instanceId === instanceId);
        if (cardIndex > -1 && this.field[fieldIndex] === null) {
            const cardToPlay = this.hand.splice(cardIndex, 1)[0]; // Saca la carta de la mano

            this.field[fieldIndex] = cardToPlay; // Coloca la nueva instancia en el campo
            if (this.scene && this.scene.debugSync) console.log(`[Player][debug] Carta movida al slot`, { player: this.id, instanceId: cardToPlay.instanceId, fieldIndex, resultingField: this.field.map(f=>f&&f.instanceId) });
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
        if (this.scene && this.scene.debugSync) console.log('[Player][debug] fuseCards called', { player: this.id, draggedIndex, targetIndex, fieldSnapshot: this.field.map(f=>f&&f.instanceId), timestamp: Date.now() });
        // Validaciones básicas de índices
        if (typeof draggedIndex !== 'number' || typeof targetIndex !== 'number') {
            console.warn('[Player.fuseCards] Índices inválidos:', draggedIndex, targetIndex);
            return null;
        }
        if (draggedIndex < 0 || draggedIndex >= this.field.length || targetIndex < 0 || targetIndex >= this.field.length) {
            console.warn('[Player.fuseCards] Índices fuera de rango:', draggedIndex, targetIndex);
            return null;
        }

        const card1 = this.field[draggedIndex];
        const card2 = this.field[targetIndex];

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
        this.field[targetIndex] = newCardInstance;
        this.field[draggedIndex] = null;

        if (this.scene && this.scene.debugSync) console.log('[Player][debug] fuseCards result', { newCardInstance: newCardInstance.instanceId, targetIndex, emptiedIndex: draggedIndex, fieldAfter: this.field.map(f=>f&&f.instanceId) });
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
        if (this.scene && this.scene.debugSync) console.log('[Player][debug] fuseFromHand called', { player: this.id, instanceId, targetIndex, handIds: this.hand.map(h=>h&&h.instanceId), targetFieldId: this.field[targetIndex] && this.field[targetIndex].instanceId, timestamp: Date.now() });
        const cardFromHandIndex = this.hand.findIndex(c => c.instanceId === instanceId);
        const cardOnField = this.field[targetIndex];

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

        // La carta en el campo que se usa para la fusión debe ir al cementerio.
        // La añadimos al cementerio antes de reemplazarla.
        this.addCardDataToGraveyard(cardOnField);

        const newCardInstance = { ...newCardData, instanceId: Phaser.Math.RND.uuid() };

        // Reemplazamos la carta en el campo con la nueva carta fusionada
        this.field[targetIndex] = newCardInstance;
        if (this.scene && this.scene.debugSync) console.log('[Player][debug] fuseFromHand result', { newCardInstance: newCardInstance.instanceId, targetIndex, fieldAfter: this.field.map(f=>f&&f.instanceId) });
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
     * Registra una carta de nivel 3 en el gestor de gemas. Si la carta aún no
     * había entregado su gema, notifica a la escena para que actualice la UI.
     * Regla: cada carta de nivel 3 genera como máximo una gema.
     * @param {{level: number, type: string, instanceId?: string}} cardData
     * @returns {string|null} El elemento de la gema obtenida o null.
     */
    registerGem(cardData) {
        const type = this.gems.registerLevel3Card(cardData);
        if (!type) return null;
        console.log('[Player] Gema obtenida', { playerId: this.id, type, total: this.gems.count(type) });
        if (this.scene && this.scene.events) {
            this.scene.events.emit('gem-collected', this.id, type, this.gems.progress());
        }
        return type;
    }

    /**
     * Añade los datos de una carta (objeto de datos, no sprite) al cementerio.
     * Si la carta es de nivel 2 o 3, la descompone en cartas de nivel 1.
     * @param {object} cardData Los datos de la carta que ha sido derrotada.
     */
    addCardDataToGraveyard(cardData) {
        const baseCardsCount = Math.pow(2, cardData.level - 1);
        console.log(`Añadiendo ${baseCardsCount} carta(s) base de tipo ${cardData.type} al cementerio.`);

        for (let i = 0; i < baseCardsCount; i++) {
            // Solo guardamos la información esencial para reconstruir la carta base.
            const baseCardId = `${cardData.type}-1`;
            this.graveyard.push({ id: baseCardId, type: cardData.type, level: 1 });
        }
    }
}