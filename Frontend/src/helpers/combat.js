import { ADVANTAGES } from './constants.js';
import CardHealthService from '../game/CardHealthService.js';

const LEVEL_DAMAGE = [
    [5, 5, 2],
    [35, 10, 25],
    [50, 45, 10]
];

/**
 * Calcula el daño base por nivel de atacante y defensor, más el modificador
 * elemental y los bonus activos.
 * @param {object} attacker Carta atacante.
 * @param {object} defender Carta defensora; su vida se actualiza.
 * @param {{bonusDamage?: number}} [options]
 * @returns {number} Daño entero entre 0% y 100%.
 */
export function calculateAttackDamage(attacker, defender, { bonusDamage = 0 } = {}) {
    const attackerLevel = Math.max(1, Math.min(3, Math.floor(Number(attacker.level) || 1)));
    const defenderLevel = Math.max(1, Math.min(3, Math.floor(Number(defender.level) || 1)));
    const attackerAdvantage = ADVANTAGES[attacker.type] === defender.type;
    const defenderAdvantage = ADVANTAGES[defender.type] === attacker.type;
    const elementModifier = attackerAdvantage ? 15 : defenderAdvantage ? -15 : 0;
    const baseDamage = LEVEL_DAMAGE[attackerLevel - 1][defenderLevel - 1];
    const rawDamage = baseDamage + elementModifier + bonusDamage;
    return Math.max(0, Math.min(100, Math.round(rawDamage)));
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
