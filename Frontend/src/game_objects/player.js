import Deck from './deck.js';
import EssenceManager from './essences.js';
import GemManager from '../game/GemManager.js';
import CardDestructionService from '../game/CardDestructionService.js';
import CardEntity from '../game/CardEntity.js';
import Battlefield from '../game/Battlefield.js';
import CardHealthService from '../game/CardHealthService.js';

/**
 * Gestiona el estado completo de un jugador, incluyendo su mazo, mano, campo,
 * cementerio y esencias. Es lógica de dominio: puede usarse sin Phaser.
 * Los cambios que la UI necesita notificar se emiten por un emitter opcional.
 */
export default class Player {
    /**
     * @param {string} id El identificador del jugador ('player' u 'opponent').
     * @param {object} [opts]
     * @param {object} [opts.scene] Escena opcional (solo para logs de sync).
     * @param {Function} [opts.onGemGained] Aviso de gema obtenida:
     *   (ownerId, type, progress).
     */
    constructor(id, { scene = null, onGemGained = null } = {}) {
        this.id = id;
        this.scene = scene;
        /** @type {Function|null} */
        this.onGemGained = onGemGained;

        this.deck = new Deck(id);
        this.essences = new EssenceManager();
        this.gems = new GemManager();

        /** @type {object[]} */
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
            // Asignamos un ID de instancia único en el momento en que la carta entra en la mano.
            // Esto nos permite rastrearla de forma única a lo largo de todo su ciclo de vida.
            CardEntity.ensureInstance(cardData);
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
     * @returns {object|null} Los datos de la carta jugada (instancia de dominio) o null si no se pudo.
     */
    playCardFromHand(instanceId, fieldIndex) {
        if (this.scene && this.scene.debugSync) {
            console.log('[Player][debug] playCardFromHand called', { player: this.id, instanceId, fieldIndex, handIds: this.hand.map(h => h && h.instanceId), fieldIds: this.field.snapshot().map(f => f && f.instanceId), timestamp: Date.now() });
        }
        const cardIndex = this.hand.findIndex(card => card.instanceId === instanceId);
        if (cardIndex > -1 && this.field.isEmpty(fieldIndex)) {
            const cardToPlay = this.hand.splice(cardIndex, 1)[0]; // Saca la carta de la mano

            this.field.set(fieldIndex, cardToPlay); // Coloca la nueva instancia en el campo
            // Regla de gemas: una carta base (nivel 1) no aporta gema.
            this.registerGem(cardToPlay);
            try {
                this._checkLevel2BombBarrage();
            } catch (e) {
                console.warn('[Player] Error en _checkLevel2BombBarrage:', e);
            }
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

        // Creamos una nueva instancia de la carta fusionada (definición + instanceId).
        const newCardInstance = CardEntity.fused(card1, card2);
        if (!newCardInstance) return null;

        // Actualizamos el campo: la nueva carta ocupa el lugar de la carta objetivo.
        // El slot de la carta arrastrada se vacía.
        this.field.set(targetIndex, newCardInstance);
        // Regla de gemas: la carta fusionada aporta una gema de su elemento.
        this.registerGem(newCardInstance);
        try {
            this._checkLevel2BombBarrage();
        } catch (e) {
            console.warn('[Player] Error en _checkLevel2BombBarrage:', e);
        }

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
        if (!CardEntity.areFusionable(cardFromHand, cardOnField)) {
            return null;
        }

        // Saca la carta de la mano
        this.hand.splice(cardFromHandIndex, 1);

        // Regla simétrica con fuseCards: la carta del campo y la de la mano se
        // consumen en la fusionada y NADA va al cementerio. Cuando la carta
        // fusionada muera, CardDestructionService devolverá su material en cartas base.

        const newCardInstance = CardEntity.fused(cardOnField, cardFromHand);
        if (!newCardInstance) return null;

        // Reemplazamos la carta en el campo con la nueva carta fusionada
        this.field.set(targetIndex, newCardInstance);
        // Regla de gemas: la carta fusionada aporta una gema de su elemento.
        this.registerGem(newCardInstance);
        try {
            this._checkLevel2BombBarrage();
        } catch (e) {
            console.warn('[Player] Error en _checkLevel2BombBarrage:', e);
        }
        if (this.scene && this.scene.debugSync) console.log('[Player][debug] fuseFromHand result', { newCardInstance: newCardInstance.instanceId, targetIndex, fieldAfter: this.field.snapshot().map(f=>f&&f.instanceId) });
        return newCardInstance;
    }
    /**
     * Llena la esencia de un tipo elemental para este jugador.
     * Regla pura de dominio: si la esencia ya estaba activa, no hace nada.
     * La notificación a la UI ('essence-activated') la emite la capa de
     * presentación que ejecuta la acción.
     * @param {string} essenceType El tipo de esencia a activar.
     * @returns {boolean} `true` si la esencia se activó ahora, `false` si ya estaba activa.
     */
    fillEssence(essenceType) {
        if (this.essences.has(essenceType)) {
            console.log(`[Player] Esencia ya activada previamente`, { playerId: this.id, essenceType });
            return false;
        }
        this.essences.activate(essenceType);
        console.log(`[Player] Esencia activada`, { playerId: this.id, essenceType, total: this.essences.size });
        return true;
    }

    /**
     * Registra una carta que entra en el campo en el gestor de gemas. Si la
     * carta aún no había entregado su gema, notifica al observador para que
     * actualice la UI.
     * Regla: cada carta de nivel 3 genera como máximo una gema de su elemento.
     * @param {{level: number, type: string, instanceId?: string}} cardData
     * @returns {string|null} El elemento de la gema obtenida o null.
     */
    registerGem(cardData) {
        const type = this.gems.registerFieldCard(cardData);
        if (!type) return null;
        console.log('[Player] Gema obtenida', { playerId: this.id, type, total: this.gems.count(type) });
        if (typeof this.onGemGained === 'function') {
            this.onGemGained(this.id, type, this.gems.progress());
        }
        return type;
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
     * Comprueba si hay al menos 3 cartas de nivel 2 en el campo y dispara una
     * ráfaga de bombas (solo mecánica + presentación) que daña todas las cartas.
     * Se ejecuta una vez por activación (bandera) para evitar ráfagas repetidas.
     */
    _checkLevel2BombBarrage() {
        if (this._level2BarrageTriggered) return;
        const cards = typeof this.field.cards === 'function' ? this.field.cards() : (this.field.snapshot ? this.field.snapshot().filter(Boolean) : []);
        let count = 0;
        for (let i = 0; i < cards.length; i++) {
            if (cards[i] && cards[i].level === 2) count += 1;
        }
        if (count < 3) return;
        this._level2BarrageTriggered = true;

        // Aplicar daño a todas las cartas del campo
        const damage = 25;
        const toDestroy = [];
        cards.forEach((card) => {
            if (!card) return;
            if (typeof card.health === 'undefined') CardHealthService.ensure(card);
            const res = CardHealthService.applyDamage(card, damage);
            if (res.destroyed) toDestroy.push(card);
        });

        // Notificar a la escena para efectos visuales/mejor gestión
        if (this.scene && typeof this.scene.triggerLevel2BombBarrage === 'function') {
            try {
                this.scene.triggerLevel2BombBarrage({ owner: this, destroyed: toDestroy, damage });
                return;
            } catch (e) {
                console.warn('[Player] Error en triggerLevel2BombBarrage:', e);
            }
        }

        // Fallback: añadir al cementerio las destruidas
        toDestroy.forEach((card) => {
            try {
                this.addCardDataToGraveyard(card);
                const idx = typeof this.field.findIndexByCard === 'function' ? this.field.findIndexByCard(card.instanceId) : -1;
                if (idx >= 0 && typeof this.field.clearAt === 'function') this.field.clearAt(idx);
            } catch { /* ignorar */ }
        });
    }
}