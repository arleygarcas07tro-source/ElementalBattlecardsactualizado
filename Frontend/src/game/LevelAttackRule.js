/**
 * Reglas de restricción de ataque por nivel de carta.
 * Se encarga de las transiciones de estado puro (sin tocar Phaser):
 * - Ataques consecutivos (nivel 2 descansa un turno tras 2 ataques seguidos).
 * - Bloqueo por una ronda (nivel 3 descansa siempre tras atacar).
 * - Limpieza de estado al comenzar un turno propio.
 *
 * El estado que gestiona se mantiene en el objeto visual de la carta:
 * lastAttackedTurn, consecutiveAttacks y blockedTurn.
 */
export default class LevelAttackRule {
    /**
     * Registra un ataque y devuelve el nuevo estado de restricción.
     * @param {object} params
     * @param {number} params.level - Nivel de la carta (1, 2 o 3).
     * @param {number} params.nowTurn - Número de turno en el que ataca.
     * @param {number|null} params.lastAttackedTurn - Turno de su último ataque (si existe).
     * @param {number} [params.consecutiveAttacks=0] - Ataques consecutivos previos.
     * @returns {{ lastAttackedTurn: number, consecutiveAttacks: number, blockedTurn: number|null }}
     */
    static registerAttack({ level, nowTurn, lastAttackedTurn = null, consecutiveAttacks = 0 }) {
        const newConsecutive = lastAttackedTurn === nowTurn - 1 ? consecutiveAttacks + 1 : 1;

        let blockedTurn = null;
        if (level === 2 && newConsecutive >= 2) {
            blockedTurn = nowTurn + 1;
        } else if (level === 3) {
            blockedTurn = nowTurn + 1;
        }

        return {
            lastAttackedTurn: nowTurn,
            consecutiveAttacks: blockedTurn === null ? newConsecutive : 0,
            blockedTurn
        };
    }

    /**
     * Aplica la limpieza de fin de turno: si la carta no atacó en su turno
     * anterior, reinicia los ataques consecutivos; y elimina bloqueos ya vencidos.
     * @param {object} state
     * @param {number|null} state.lastAttackedTurn
     * @param {number} [state.consecutiveAttacks=0]
     * @param {number|null} [state.blockedTurn=null]
     * @param {number} ownTurnNumber - Número del turno propio que comienza.
     * @returns {{ lastAttackedTurn: number|null, consecutiveAttacks: number, blockedTurn: number|null }}
     */
    static startOfTurn(
        { lastAttackedTurn = null, consecutiveAttacks = 0, blockedTurn = null },
        ownTurnNumber
    ) {
        const resetConsecutive = lastAttackedTurn !== ownTurnNumber - 1;
        const blockedExpired = typeof blockedTurn === 'number' && blockedTurn < ownTurnNumber;

        return {
            lastAttackedTurn,
            consecutiveAttacks: resetConsecutive ? 0 : consecutiveAttacks,
            blockedTurn: blockedExpired ? null : blockedTurn
        };
    }
}