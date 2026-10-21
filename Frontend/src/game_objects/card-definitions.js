/**
 * Base de datos central para todas las definiciones de cartas del juego.
 * Se genera programáticamente a partir de la plantilla { tipo x nivel }
 * para mantener el bundle pequeño y evitar errores de tipeo repetidos.
 * Cada carta tiene un ID único ('<tipo>-<nivel>') usado para construir los mazos.
 *
 * API exportada (idéntica a la versión manual):
 *   CardDefinitions['fuego-1'] -> { id: 'fuego-1', type: 'fuego', level: 1 }
 *   getBaseCardTypes()          -> ['sombra', 'fuego', ...]
 */

import { CARD_TYPES as CardTypes } from '../helpers/constants.js';

// Los 6 tipos elementales en el orden histórico de la base de datos.
const ORDERED_TYPES = [
    CardTypes.SOMBRA,
    CardTypes.FUEGO,
    CardTypes.AGUA,
    CardTypes.PLANTA,
    CardTypes.LUZ,
    CardTypes.ESPIRITU
];

const LEVELS = [1, 2, 3];

export const CardDefinitions = Object.freeze(
    Object.fromEntries(
        ORDERED_TYPES.flatMap((type) =>
            LEVELS.map((level) => [
                `${type}-${level}`,
                { id: `${type}-${level}`, type, level }
            ])
        )
    )
);

/**
 * Devuelve los tipos elementales de las cartas base (nivel 1).
 * @returns {string[]} Lista de tipos únicos presentes en las cartas de nivel 1.
 */
export function getBaseCardTypes() {
    return [...new Set(Object.values(CardDefinitions).filter(d => d.level === 1).map(d => d.type))];
}