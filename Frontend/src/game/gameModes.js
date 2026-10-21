/**
 * Catálogo de modos de juego. Capa de datos del dominio: describe las
 * reglas de victoria/derrota de cada modalidad sin depender de Phaser.
 *
 * - `usesGems`: si el modo exige reunir las gemas elementales para ganar.
 * - `requiresField`: si el modo exige dominar los 6 elementos en el campo.
 * - `matchTimeMs`: límite de tiempo global de la partida (contrarreloj).
 * - `maxTurns`: máximo de turnos propios por jugador.
 */

export const GAME_MODES = {
    clasico: {
        id: 'clasico',
        name: 'Clásico',
        desc: 'Reglas originales: domina los 6 elementos en el campo o llena las 6 esencias.',
        usesGems: false,
        requiresField: false,
        matchTimeMs: null,
        maxTurns: null
    },
    gemas: {
        id: 'gemas',
        name: 'Gemas Elementales',
        desc: 'Reúne las gemas requeridas y domina los 6 elementos en el campo.',
        usesGems: true,
        requiresField: true,
        matchTimeMs: null,
        maxTurns: null
    },
    contrarreloj: {
        id: 'contrarreloj',
        name: 'Contrarreloj',
        desc: '3 minutos para reunir las gemas y dominar el campo. Si el tiempo termina, ambos pierden.',
        usesGems: true,
        requiresField: true,
        matchTimeMs: 180000,
        maxTurns: null
    },
    turnos30: {
        id: 'turnos30',
        name: '30 Turnos',
        desc: 'Dispones de 30 turnos propios para reunir las gemas y dominar el campo.',
        usesGems: true,
        requiresField: true,
        matchTimeMs: null,
        maxTurns: 30
    }
};

export const DEFAULT_MODE = 'clasico';

/**
 * Devuelve la definición de un modo por id (con fallback al modo clásico).
 * @param {string} id
 * @returns {object}
 */
export function getGameMode(id) {
    return GAME_MODES[id] || GAME_MODES[DEFAULT_MODE];
}

/**
 * @returns {object[]} Lista de modos para la UI de selección.
 */
export function listGameModes() {
    return Object.values(GAME_MODES);
}
