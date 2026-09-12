/**
 * Base de datos central para todas las definiciones de cartas del juego.
 * Cada carta tiene un ID único que se usará para construir los mazos.
 * Las propiedades (ataque, defensa, etc.) se definen aquí.
 */

import { CARD_TYPES as CardTypes } from '../helpers/constants.js';

export const CardDefinitions = {
    // --- CARTAS DE SOMBRA ---
    'sombra-1': {
        id: 'sombra-1',
        type: CardTypes.SOMBRA,
        level: 1,
    },
    'sombra-2': {
        id: 'sombra-2',
        type: CardTypes.SOMBRA,
        level: 2,
    },
    'sombra-3': {
        id: 'sombra-3',
        type: CardTypes.SOMBRA,
        level: 3,
    },

    // --- CARTAS DE FUEGO ---
    'fuego-1': {
        id: 'fuego-1',
        type: CardTypes.FUEGO,
        level: 1,
    },
    'fuego-2': {
        id: 'fuego-2',
        type: CardTypes.FUEGO,
        level: 2,
    },
    'fuego-3': {
        id: 'fuego-3',
        type: CardTypes.FUEGO,
        level: 3,
    },

    // --- CARTAS DE AGUA ---
    'agua-1': {
        id: 'agua-1',
        type: CardTypes.AGUA,
        level: 1,
    },
    'agua-2': {
        id: 'agua-2',
        type: CardTypes.AGUA,
        level: 2,
    },
    'agua-3': {
        id: 'agua-3',
        type: CardTypes.AGUA,
        level: 3,
    },  
    // --- CARTAS DE PLANTA ---
    'planta-1': {
        id: 'planta-1',
        type: CardTypes.PLANTA,
        level: 1,
    },
    'planta-2': {
        id: 'planta-2',
        type: CardTypes.PLANTA,
        level: 2,
    },
    'planta-3': {
        id: 'planta-3',
        type: CardTypes.PLANTA,
        level: 3,
    },      
    // --- CARTAS DE LUZ ---
    'luz-1': {
        id: 'luz-1',
        type: CardTypes.LUZ,
        level: 1,
    },
    'luz-2': {
        id: 'luz-2',
        type: CardTypes.LUZ,
        level: 2,
    },      
    'luz-3': {
        id: 'luz-3',
        type: CardTypes.LUZ,
        level: 3,
    },
    // --- CARTAS DE ESPIRITU ---
    'espiritu-1': {
        id: 'espiritu-1',
        type: CardTypes.ESPIRITU,
        level: 1,
    },          
    'espiritu-2': {
        id: 'espiritu-2',
        type: CardTypes.ESPIRITU,
        level: 2,
    },
    'espiritu-3': {
        id: 'espiritu-3',
        type: CardTypes.ESPIRITU,
        level: 3,
    },
};

/**
 * Devuelve los tipos elementales de las cartas base (nivel 1).
 * @returns {string[]} Lista de tipos únicos presentes en las cartas de nivel 1.
 */
export function getBaseCardTypes() {
    return [...new Set(Object.values(CardDefinitions).filter(d => d.level === 1).map(d => d.type))];
}