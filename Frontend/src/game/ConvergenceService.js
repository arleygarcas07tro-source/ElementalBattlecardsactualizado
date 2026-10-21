/**
 * Regla de Convergencia: la victoria por control de campo (6 tipos únicos)
 * ya no es instantánea. Al completar los 6 tipos se "arma" la convergencia y
 * el jugador gana solo si conserva ese tablero durante un turno rival completo.
 * Responsabilidad: lógica pura de consulta sobre el set de tipos presente.
 * Sin dependencias de Phaser ni de la escena.
 */
export default class ConvergenceService {
    /**
     * ¿El set de tipos alcanza el requisito de convergencia?
     * @param {Set<string>} fieldTypes Tipos presentes en el campo.
     * @param {number} required Cantidad de tipos únicos necesarios.
     * @returns {boolean}
     */
    static isConverged(fieldTypes, required) {
        return !!fieldTypes && fieldTypes.size >= required;
    }

    /**
     * Cuántos tipos faltan para armar la convergencia.
     * @param {Set<string>} fieldTypes Tipos presentes en el campo.
     * @param {number} required Cantidad de tipos únicos necesarios.
     * @returns {number}
     */
    static missingCount(fieldTypes, required) {
        return Math.max(0, required - (fieldTypes ? fieldTypes.size : 0));
    }
}