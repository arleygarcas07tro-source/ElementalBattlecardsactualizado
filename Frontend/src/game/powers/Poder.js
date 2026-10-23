import EssencePowerService from '../EssencePowerService.js';

/**
 * Clase base de un poder de esencia (estrategia polimórfica).
 *
 * Responsabilidad agregada: encapsular un poder de esencia como unidad
 * extensible. Cada elemento nuevo aporta su propia clase SIN modificar
 * GameMatch (OCP). La validación delega en EssencePowerService, que sigue
 * siendo la única fuente de verdad de las reglas actuales.
 */
export default class Poder {
    /**
     * @param {string} type Tipo de esencia ('fuego', 'agua', ...).
     */
    constructor(type) {
        this.type = type;
    }

    /**
     * Valida si el poder puede usarse con el estado actual. Delega en
     * EssencePowerService.plan para conservar las reglas existentes.
     * @param {object} ctx
     * @param {object} ctx.player Estado del jugador.
     * @param {object} ctx.opponent Estado del rival.
     * @param {object} ctx.turn Gestor de turnos.
     * @returns {{ok: boolean, reason?: string, name?: string, gemCost?: number}}
     */
    canUse(ctx) {
        return EssencePowerService.plan(this.type, {
            isPlayerTurn: ctx.turn ? ctx.turn.state === 'player-turn' : true,
            essenceActive: ctx.player && ctx.player.essences ? ctx.player.essences.has(this.type) : false,
            graveyard: ctx.player && ctx.player.graveyard ? ctx.player.graveyard : [],
            opponentHand: ctx.opponent && ctx.opponent.hand ? ctx.opponent.hand : [],
            // Coste: las gemas del mismo elemento que el poder.
            gemCount: ctx.player && ctx.player.gems ? ctx.player.gems.count(this.type) : 0,
            // Límite de usos definido por el propio poder.
            usesThisTurn: ctx.turn && typeof ctx.turn.getPowerUses === 'function' ? ctx.turn.getPowerUses(this.type) : (ctx.turn && ctx.turn.playerPowerUses ? (ctx.turn.playerPowerUses[this.type] || 0) : 0)
        });
    }

    /**
     * Contrato de execute(): recibe el mismo contexto que canUse() más el
     * callback de notificación que el cliente inyecta. Cada derivada aplica su
     * efecto y devuelve las etiquetas `changed` (también vacío) que la UI usa
     * para reaccionar. Por defecto no hace nada; cada poder concreto se supone
     * que sobrescribe este método.
     * @param {object} _ctx
     * @param {object} _ctx.player Estado del jugador.
     * @param {object} _ctx.opponent Estado del rival.
     * @param {object} _ctx.turn Gestor de turnos.
     * @param {Function} _ctx.emitConvergenceStatus Notificación que Conducto
     *   usa para informar el bloqueo de Convergencia; el resto lo ignora.
     * @returns {string[]}
     */
    execute(_ctx) {
        return [];
    }
}