import { CARD_TYPES } from '../helpers/constants.js';
import CardEntity from './CardEntity.js';

/**
 * Catálogo y ejecución de poderes de esencia. Cada esencia activada desbloquea
 * un poder que el jugador puede usar UNA vez por turno propio (clic en el orbe).
 * Responsabilidad: reglas puras (qué poder existe, cuándo se puede usar y cómo
 * se ejecutan los efectos AGUA/SOMBRA sobre el estado del jugador). La
 * notificación a la UI queda fuera de este servicio.
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

    /**
     * Ejecuta el poder AGUA (Rescate): devuelve a la mano la carta base
     * (nivel 1) más reciente del cementerio. Asigna un instanceId nuevo,
     * como cualquier robo.
     * @param {object} player Estado del jugador que recibe el rescate.
     * @returns {object|null} La carta devuelta a la mano o null si no hay material.
     */
    static rescueGraveyardCard(player) {
        if (player.graveyard.length === 0) return null;
        const base = player.graveyard.pop();
        const card = CardEntity.create(base, { forceNewId: true });
        player.hand.push(card);
        console.log(`[EssencePowerService] Rescate: carta base ${card.type}-${card.level} devuelta a la mano.`);
        return card;
    }

    /**
     * Ejecuta el poder SOMBRA (Robar): el rival descarta la carta de mayor
     * nivel de su mano. La carta descartada se descompone en material de
     * cementerio a través de Player.addCardDataToGraveyard.
     * @param {object} opponent Estado del jugador rival que debe descartar.
     * @returns {object|null} La carta descartada o null si el rival no tiene mano.
     */
    static stealHighestCard(opponent) {
        if (opponent.hand.length === 0) return null;
        let idx = 0;
        for (let i = 1; i < opponent.hand.length; i++) {
            if (opponent.hand[i].level > opponent.hand[idx].level) idx = i;
        }
        const discarded = opponent.hand.splice(idx, 1)[0];
        opponent.addCardDataToGraveyard(discarded);
        console.log(`[EssencePowerService] Robar: ${opponent.id} descartó ${discarded.id} (nivel ${discarded.level}).`);
        return discarded;
    }
}