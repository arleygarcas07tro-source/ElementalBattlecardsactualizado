import { ADVANTAGES } from "./constants.js";

/**
 * Determina el resultado de un combate entre dos cartas.
 * @param {object} attacker - La carta atacante.
 * @param {string} attacker.type - El tipo de la carta atacante (ej. 'fuego').
 * @param {number} attacker.level - El nivel de la carta atacante (1, 2, o 3).
 * @param {object} defender - La carta defensora.
 * @param {string} defender.type - El tipo de la carta defensora.
 * @param {number} defender.level - El nivel de la carta defensora.
 * @returns {object} Un objeto con el resultado. ej. { winner: 'attacker', loser: 'defender' }
 */
export function resolveCombat(attacker, defender) {
    const levelDiff = attacker.level - defender.level;

    // Regla 3: Diferencia de 2 niveles o más es victoria automática.
    if (levelDiff >= 2) {
        return { winner: 'attacker', loser: 'defender' };
    }
    if (levelDiff <= -2) {
        return { winner: 'defender', loser: 'attacker' };
    }

    const attackerAdvantage = ADVANTAGES[attacker.type];
    const defenderAdvantage = ADVANTAGES[defender.type];

    // Regla 3: Diferencia de 1 nivel.
    if (levelDiff === 1) {
        // El atacante es neutral contra su desventaja y gana a los neutrales.
        if (defenderAdvantage === attacker.type) { // El defensor tenía ventaja de tipo
            return { winner: 'none', loser: 'none' }; // Se vuelve neutral
        }
        // Si el defensor no tiene ventaja, el atacante gana.
        return { winner: 'attacker', loser: 'defender' };
    }

    if (levelDiff === -1) {
        // El defensor es neutral contra su desventaja y gana a los neutrales.
        if (attackerAdvantage === defender.type) { // El atacante tenía ventaja de tipo
            return { winner: 'none', loser: 'none' }; // Se vuelve neutral
        }
        // Si el atacante no tiene ventaja, el defensor gana.
        return { winner: 'defender', loser: 'attacker' };
    }

    // Regla 3: Mismo nivel. Se aplica la ventaja de tipo normal.
    if (attackerAdvantage === defender.type) {
        return { winner: 'attacker', loser: 'defender' };
    }
    if (defenderAdvantage === attacker.type) {
        return { winner: 'defender', loser: 'attacker' };
    }

    // Si no hay ventaja de tipo, es neutral.
    return { winner: 'none', loser: 'none' };
}
