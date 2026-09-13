/**
 * Campo de batalla de un jugador: gestiona los slots como estado puro.
 * Encapsula el acceso por índice, las consultas (cartas, tipos, huecos)
 * y las mutaciones (colocar, limpiar), para que ni la escena ni el dominio
 * manipulen arrays crudos. Sin dependencias de Phaser.
 */
export default class Battlefield {
    constructor(size = 6) {
        this._slots = new Array(size).fill(null);
    }

    /**
     * Número de slots del campo.
     * @returns {number}
     */
    get size() {
        return this._slots.length;
    }

    /**
     * Devuelve la carta en un slot, o null/undefined si está vacío o fuera de rango.
     * @param {number} index
     * @returns {object|null|undefined}
     */
    get(index) {
        if (index < 0 || index >= this._slots.length) return undefined;
        return this._slots[index];
    }

    /**
     * Coloca una carta (o null) en un slot.
     * @param {number} index
     * @param {object|null} card
     */
    set(index, card) {
        if (index < 0 || index >= this._slots.length) return;
        this._slots[index] = card;
    }

    /**
     * Vacía un slot.
     * @param {number} index
     */
    clearAt(index) {
        this.set(index, null);
    }

    /**
     * Comprueba si un slot está vacío.
     * @param {number} index
     * @returns {boolean}
     */
    isEmpty(index) {
        const card = this.get(index);
        return card === null || card === undefined;
    }

    /**
     * Indica si hay al menos una carta en el campo.
     * @returns {boolean}
     */
    hasAny() {
        return this._slots.some(card => card !== null);
    }

    /**
     * Cantidad de cartas en el campo.
     * @returns {number}
     */
    count() {
        return this._slots.filter(card => card !== null).length;
    }

    /**
     * Lista de cartas presentes en el campo (sin huecos).
     * @returns {object[]}
     */
    cards() {
        return this._slots.filter(card => card !== null);
    }

    /**
     * Tipos elementales presentes en el campo.
     * @returns {Set<string>}
     */
    types() {
        return new Set(this.cards().map(card => card.type));
    }

    /**
     * Índices de los slots vacíos.
     * @returns {number[]}
     */
    emptyIndices() {
        return this._slots
            .map((slot, i) => (slot === null ? i : -1))
            .filter(i => i !== -1);
    }

    /**
     * Busca el slot que contiene una carta por su instanceId.
     * @param {string} instanceId
     * @returns {number} Índice del slot o -1.
     */
    findIndexByCard(instanceId) {
        return this._slots.findIndex(slot => slot && slot.instanceId === instanceId);
    }

    /**
     * Copia del array interno de slots (para depuración o serialización).
     * @returns {(object|null)[]}
     */
    snapshot() {
        return this._slots.slice();
    }
}