import { CARD_TYPES } from '../helpers/constants.js';

/**
 * Catálogo de poderes de esencia. Cada esencia activada desbloquea un poder
 * que el jugador puede usar UNA vez por turno propio (clic en el orbe).
 * Responsabilidad: reglas puras (qué poder existe y cuándo se puede usar).
 * Sin dependencias de Phaser ni de la escena.
 */
const POWERS = {
    [CARD_TYPES.FUEGO]: {
        name: 'Ráfaga',
        description: 'Tu próximo ataque en este turno también gana si el combate termina en empate.',
        needsGraveyard: false,
        needsOpponentHand: false
    },
    [CARD_TYPES.AGUA]: {
        name: 'Rescate',
        description: 'Devuelve a tu mano la carta base (nivel 1) más reciente de tu cementerio.',
        needsGraveyard: true,
        needsOpponentHand: false
    },
    [CARD_TYPES.PLANTA]: {
        name: 'Brotar',
        description: 'Roba 2 cartas de tu mazo.',
        needsGraveyard: false,
        needsOpponentHand: false
    },
    [CARD_TYPES.LUZ]: {
        name: 'Clarividencia',
        description: 'Revelas la mano del rival (queda visible hasta que robe o juegue).',
        needsGraveyard: false,
        needsOpponentHand: false
    },
    [CARD_TYPES.SOMBRA]: {
        name: 'Robar',
        description: 'El rival descarta la carta de mayor nivel de su mano (va a su cementerio).',
        needsGraveyard: false,
        needsOpponentHand: true
    },
    [CARD_TYPES.ESPIRITU]: {
        name: 'Conducto',
        description: 'Bloquea la Convergencia del rival (victoria por 6 tipos) durante su próximo turno.',
        needsGraveyard: false,
        needsOpponentHand: false
    }
};

export default class EssencePowerService {
    static get POWERS() {
        return POWERS;
    }

    /**
     * Devuelve la información de un poder elemental.
     * @param {string} type Tipo de esencia ('fuego', 'agua', ...).
     * @returns {{name: string, description: string}|null}
     */
    static getInfo(type) {
        return POWERS[type] || null;
    }

    /**
     * Valida si un poder puede usarse en este momento.
     * @param {string} type Tipo de esencia.
     * @param {object} ctx
     * @param {boolean} ctx.isPlayerTurn - ¿Es el turno del jugador actual?
     * @param {boolean} ctx.usedThisTurn - ¿Ya usó su poder de esencia este turno?
     * @param {boolean} ctx.essenceActive - ¿Está activa esa esencia?
     * @param {object[]} ctx.graveyard - Cementerio del jugador.
     * @param {object[]} ctx.opponentHand - Mano del rival.
     * @returns {{ok: boolean, reason?: string, name?: string}}
     */
    static plan(type, ctx = {}) {
        const { isPlayerTurn, usedThisTurn, essenceActive, graveyard = [], opponentHand = [] } = ctx;
        if (!POWERS[type]) return { ok: false, reason: 'tipo-desconocido' };
        if (!isPlayerTurn) return { ok: false, reason: 'es-tu-turno' };
        if (usedThisTurn) return { ok: false, reason: 'poder-ya-usado' };
        if (!essenceActive) return { ok: false, reason: 'esencia-inactiva' };
        if (POWERS[type].needsGraveyard && graveyard.length === 0) {
            return { ok: false, reason: 'sin-cementerio' };
        }
        if (POWERS[type].needsOpponentHand && opponentHand.length === 0) {
            return { ok: false, reason: 'rival-sin-mano' };
        }
        return { ok: true, name: POWERS[type].name };
    }
}