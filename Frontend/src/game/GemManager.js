import { CARD_TYPES as CardTypes } from '../helpers/constants.js';

const ELEMENTS = Object.values(CardTypes);

/**
 * Gestiona las gemas elementales de un jugador durante la partida.
 * Lógica pura de dominio (sin Phaser, sin DOM): contabiliza gemas por
 * elemento y hace cumplir la regla "una sola gema por carta de nivel 3",
 * marcando cada instancia de carta que ya generó su gema.
 */
export default class GemManager {
    /**
     * @param {Object.<string, number>|null} [requirements=null] Gemas requeridas por elemento.
     */
    constructor(requirements = null) {
        this.requirements = requirements ? { ...requirements } : null;
        this.counts = {};
        ELEMENTS.forEach((type) => { this.counts[type] = 0; });
        // instanceId de las cartas de nivel 3 que ya entregaron su gema.
        this.claimed = new Set();
    }

    /**
     * Define las gemas necesarias por elemento para cumplir el objetivo.
     * @param {Object.<string, number>|null} requirements
     */
    setRequirements(requirements) {
        this.requirements = requirements ? { ...requirements } : null;
    }

    /**
     * Registra una carta de nivel 3 y, si aún no había entregado gema,
     * incrementa el contador del elemento correspondiente.
     * Regla: cada carta de nivel 3 genera como máximo UNA gema.
     * @param {{level: number, type: string, instanceId?: string, id?: string}} cardData
     * @returns {string|null} El elemento de la gema obtenida o null si no corresponde.
     */
    registerLevel3Card(cardData) {
        if (!cardData || cardData.level !== 3) return null;
        const type = cardData.type;
        if (!Object.prototype.hasOwnProperty.call(this.counts, type)) return null;

        const key = cardData.instanceId || cardData.id || null;
        if (key) {
            if (this.claimed.has(key)) return null;
            this.claimed.add(key);
        }

        this.counts[type] += 1;
        return type;
    }

    /**
     * @param {string} type Elemento.
     * @returns {number} Gemas acumuladas de ese elemento.
     */
    count(type) {
        return this.counts[type] || 0;
    }

    /**
     * @returns {Object.<string, number>} Copia de todos los contadores.
     */
    getAll() {
        return { ...this.counts };
    }

    /**
     * @returns {number} Total de gemas acumuladas.
     */
    get total() {
        return ELEMENTS.reduce((sum, type) => sum + (this.counts[type] || 0), 0);
    }

    /**
     * Indica si se reunieron todas las gemas requeridas en todos los elementos.
     * @returns {boolean} false si no hay requisitos definidos.
     */
    meetsAll() {
        if (!this.requirements) return false;
        return ELEMENTS.every((type) => (this.counts[type] || 0) >= (this.requirements[type] || 0));
    }

    /**
     * Progreso por elemento para la UI: gemas obtenidas vs requeridas.
     * @returns {Object.<string, {have: number, need: number, met: boolean}>}
     */
    progress() {
        const out = {};
        ELEMENTS.forEach((type) => {
            const have = this.counts[type] || 0;
            const need = this.requirements ? (this.requirements[type] || 0) : 0;
            out[type] = { have, need, met: have >= need };
        });
        return out;
    }

    /**
     * @returns {{counts: Object.<string, number>, claimed: string[]}} Estado serializable (sync).
     */
    snapshot() {
        return { counts: this.getAll(), claimed: [...this.claimed] };
    }
}
