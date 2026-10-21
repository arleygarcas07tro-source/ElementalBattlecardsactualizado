/**
 * Catálogo de objetivos de gemas elementales por nivel de dificultad (1-10).
 * Capa de datos del dominio: qué cantidad de gemas de cada elemento debe
 * reunir un jugador para completar el objetivo de la partida.
 *
 * Escala progresiva: a mayor dificultad, más gemas (y por tanto más
 * fusiones de nivel 3) son necesarias para ganar.
 */

/** @type {Object.<number, Object.<string, number>>} */
export const GEM_REQUIREMENTS = {
    1:  { fuego: 2, agua: 2, planta: 2, luz: 2, sombra: 2, espiritu: 2 },
    2:  { fuego: 3, agua: 2, planta: 2, luz: 2, sombra: 2, espiritu: 2 },
    3:  { fuego: 3, agua: 3, planta: 2, luz: 2, sombra: 2, espiritu: 2 },
    4:  { fuego: 3, agua: 3, planta: 3, luz: 2, sombra: 3, espiritu: 2 },
    5:  { fuego: 4, agua: 3, planta: 3, luz: 3, sombra: 3, espiritu: 3 },
    6:  { fuego: 4, agua: 4, planta: 4, luz: 3, sombra: 4, espiritu: 3 },
    7:  { fuego: 5, agua: 4, planta: 4, luz: 3, sombra: 4, espiritu: 4 },
    8:  { fuego: 6, agua: 5, planta: 4, luz: 3, sombra: 4, espiritu: 4 },
    9:  { fuego: 6, agua: 6, planta: 5, luz: 4, sombra: 5, espiritu: 4 },
    10: { fuego: 6, agua: 5, planta: 5, luz: 3, sombra: 5, espiritu: 5 }
};

/**
 * Devuelve las gemas requeridas para un nivel de dificultad.
 * @param {number} level Nivel 1-10 (se recorta al rango válido).
 * @returns {Object.<string, number>}
 */
export function getGemRequirements(level) {
    const clamped = Math.min(10, Math.max(1, Math.round(Number(level) || 1)));
    return { ...GEM_REQUIREMENTS[clamped] };
}

/**
 * @returns {number} Total de gemas requeridas para un nivel.
 */
export function totalGemsFor(level) {
    return Object.values(getGemRequirements(level)).reduce((sum, n) => sum + n, 0);
}
