import { CARD_TYPES } from '../../helpers/constants.js';
import EssencePowerService from '../EssencePowerService.js';
import Poder from './Poder.js';

/**
 * Implementaciones concretas de los 6 poderes actuales. Cada una expresa
 * exactamente el efecto que hoy realizaba su `case` en GameMatch.useEssencePower.
 * Las reglas de validación viven en EssencePowerService (Poder.canUse delega).
 */

class Rafaga extends Poder {
    execute(ctx) {
        ctx.turn.playerNextAttackBreaksTie = true;
        return [];
    }
}

class Rescate extends Poder {
    execute(ctx) {
        const rescued = EssencePowerService.rescueGraveyardCard(ctx.player);
        return rescued ? ['player-hand'] : [];
    }
}

class Brotar extends Poder {
    execute(ctx) {
        ctx.player.drawCard();
        ctx.player.drawCard();
        return ['player-hand', 'deck'];
    }
}

class Clarividencia extends Poder {
    execute() {
        return ['reveal-opponent-hand'];
    }
}

class Robar extends Poder {
    execute(ctx) {
        const discarded = EssencePowerService.stealHighestCard(ctx.opponent);
        return discarded ? ['opponent-hand', 'deck'] : [];
    }
}

class Conducto extends Poder {
    execute(ctx) {
        ctx.turn.opponentConvergenceBlocked = true;
        ctx.emitConvergenceStatus();
        return ['convergence'];
    }
}

const PODERES = {
    [CARD_TYPES.FUEGO]: new Rafaga(CARD_TYPES.FUEGO),
    [CARD_TYPES.AGUA]: new Rescate(CARD_TYPES.AGUA),
    [CARD_TYPES.PLANTA]: new Brotar(CARD_TYPES.PLANTA),
    [CARD_TYPES.LUZ]: new Clarividencia(CARD_TYPES.LUZ),
    [CARD_TYPES.SOMBRA]: new Robar(CARD_TYPES.SOMBRA),
    [CARD_TYPES.ESPIRITU]: new Conducto(CARD_TYPES.ESPIRITU)
};

/**
 * Registro de poderes de esencia.
 *
 * Responsabilidad agregada: mapear cada tipo elemental a su poder concreto y
 * ser el ÚNICO punto de registro. Agregar un poder nuevo es añadir una clase y
 * una entrada en `PODERES`; GameMatch no se modifica (OCP).
 */
export default class PoderesRegistry {
    /**
     * Todos los poderes registrados.
     * @returns {Poder[]}
     */
    static get all() {
        return Object.values(PODERES);
    }

    /**
     * Obtiene el poder de un tipo de esencia.
     * @param {string} essenceType
     * @returns {Poder|null}
     */
    static get(essenceType) {
        return PODERES[essenceType] || null;
    }
}