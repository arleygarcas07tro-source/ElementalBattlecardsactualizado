import { CARD_TYPES as CardTypes } from '../helpers/constants.js';

/**
 * Gestiona el estado de las esencias elementales para un jugador.
 * Esta clase encapsula la lógica de activación y consulta de esencias.
 */
export default class EssenceManager {
    /**
     * Inicializa el gestor de esencias. Todas las esencias comienzan desactivadas.
     */
    constructor() {
        /**
         * @private
         * @type {Object.<string, boolean>}
         */
        this._essences = {
            [CardTypes.FUEGO]: false,
            [CardTypes.AGUA]: false,
            [CardTypes.PLANTA]: false,
            [CardTypes.LUZ]: false,
            [CardTypes.SOMBRA]: false,
            [CardTypes.ESPIRITU]: false,
        };
    }

    /**
     * Activa una esencia de un tipo específico.
     * Si la esencia ya está activa, no hace nada.
     * @param {string} type El tipo de esencia a activar (usando CardTypes).
     */
    activate(type) {
        if (Object.prototype.hasOwnProperty.call(this._essences, type)) {
            this._essences[type] = true;
            console.log(`Esencia de ${type} activada.`);
        } else {
            console.warn(`Se intentó activar una esencia de tipo desconocido: ${type}`);
        }
    }

    /**
     * Comprueba si una esencia de un tipo específico está activa.
     * @param {string} type El tipo de esencia a comprobar.
     * @returns {boolean} `true` si la esencia está activa, `false` en caso contrario.
     */
    has(type) {
        return this._essences[type] === true;
    }

    /**
     * Devuelve un objeto con el estado actual de todas las esencias.
     * @returns {Object.<string, boolean>}
     */
    getAll() {
        return { ...this._essences };
    }

    /**
     * Cantidad de esencias activas.
     * @returns {number}
     */
    get size() {
        return Object.values(this._essences).filter(Boolean).length;
    }
}