import { ADVANTAGES } from './constants.js';
import CardHealthService from '../game/CardHealthService.js';

/**
 * Calcula daño según el elemento y el nivel de la carta atacante.
 * El daño neutral empieza en 25%; cada nivel del atacante añade 5%.
 * La ventaja elemental añade 15% y la desventaja resta 15%.
 * @param {object} attacker Carta atacante.
 * @param {object} defender Carta defensora; su vida se actualiza.
 * @param {{bonusDamage?: number}} [options]
 * @returns {{winner: string, loser: string, damage: number, defenderHealth: number, destroyed: boolean}}
 */
export function calculateAttackDamage(attacker, defender, { bonusDamage = 0 } = {}) {
    const attackerLevel = Math.max(1, Number(attacker.level) || 1);
    const attackerAdvantage = ADVANTAGES[attacker.type] === defender.type;
    const defenderAdvantage = ADVANTAGES[defender.type] === attacker.type;
    const elementModifier = attackerAdvantage ? 15 : defenderAdvantage ? -15 : 0;
    const rawDamage = 25 + (attackerLevel - 1) * 5 + elementModifier + bonusDamage;
    return Math.max(5, Math.min(100, Math.round(rawDamage)));
}

export function resolveCombat(attacker, defender, options = {}) {
    const damage = calculateAttackDamage(attacker, defender, options);
    const { health: defenderHealth, destroyed } = CardHealthService.applyDamage(defender, damage);

    return {
        winner: destroyed ? 'attacker' : 'none',
        loser: destroyed ? 'defender' : 'none',
        damage,
        defenderHealth,
        destroyed
    };
}
