import { CARD_TYPES as CardTypes } from '../helpers/constants.js';

const ELEMENTS = Object.values(CardTypes);

/**
 * Gestiona las gemas elementales de un jugador durante la partida.
 * Lógica pura de dominio (sin Phaser, sin DOM): contabiliza gemas por
 * elemento y hace cumplir la regla "una sola gema por carta fusionada",
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
        // instanceId de las cartas fusionadas que ya entregaron su gema.
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
     * Registra una carta que entra en el campo y, si aún no había entregado
     * gema, incrementa el contador del elemento correspondiente.
     * Regla de economía: solo una carta de nivel 3 genera UNA gema de su
     * elemento, una sola vez por instancia.
     * @param {{level: number, type: string, instanceId?: string, id?: string}} cardData
     * @returns {string|null} El elemento de la gema obtenida o null si no corresponde.
     */
    registerFieldCard(cardData) {
        if (!cardData || cardData.level < 3) return null;
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
     * Indica si hay gemas suficientes de un elemento para pagar un coste.
     * @param {string} type Elemento.
     * @param {number} amount Coste en gemas.
     * @returns {boolean}
     */
    canAfford(type, amount) {
        if (!amount || amount <= 0) return true;
        return this.count(type) >= amount;
    }

    /**
     * Gasta gemas de un elemento (coste de un poder de esencia). No permite
     * dejar el contador en negativo: si no hay gemas suficientes no se gasta nada.
     * @param {string} type Elemento.
     * @param {number} amount Coste en gemas.
     * @returns {boolean} `true` si el coste se pudo pagar.
     */
    consume(type, amount) {
        if (!amount || amount <= 0) return true;
        if (!this.canAfford(type, amount)) return false;
        this.counts[type] = this.count(type) - amount;
        return true;
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
