import { GAME_CONFIG } from '../helpers/constants.js';

const REASON_LOGS = {
    playerInactive: '[GameScene] VICTORIA: OPONENTE (inactividad del jugador)',
    opponentInactive: '[GameScene] VICTORIA: JUGADOR (inactividad del oponente)',
    playerEssences: '[GameScene] VICTORIA: JUGADOR (llenó las 6 esencias)',
    opponentEssences: '[GameScene] VICTORIA: OPONENTE (llenó las 6 esencias)'
};

/**
 * Evaluador puro de condiciones de victoria. Recibe los estados del jugador,
 * oponente y turno, y decide si hay ganador y por qué. Sin dependencias de Phaser.
 *
 * NOTA: la victoria por control de campo (6 tipos) NO se evalúa aquí: vive en
 * ConvergenceService + la escena, porque ya no es instantánea (exige conservar
 * los 6 tipos durante un turno rival completo).
 */
export default class VictoryEvaluator {
    /**
     * Evalúa las condiciones de victoria.
     * @param {{ player: object, opponent: object, turn: object, config: object }} ctx
     * @returns {{ winner: string|null, reason: string|null, log: string|null }}
     */
    static evaluate({ player, opponent, turn, config = GAME_CONFIG }) {
        if (turn.playerInactiveTurns >= config.INACTIVE_TURNS_TO_LOSE) {
            return { winner: 'opponent', reason: 'playerInactive', log: REASON_LOGS.playerInactive };
        }
        if (turn.opponentInactiveTurns >= config.INACTIVE_TURNS_TO_LOSE) {
            return { winner: 'player', reason: 'opponentInactive', log: REASON_LOGS.opponentInactive };
        }

        if (player.essences.size === config.ESSENCES_TO_WIN) {
            return { winner: 'player', reason: 'playerEssences', log: REASON_LOGS.playerEssences };
        }
        if (opponent.essences.size === config.ESSENCES_TO_WIN) {
            return { winner: 'opponent', reason: 'opponentEssences', log: REASON_LOGS.opponentEssences };
        }

        return { winner: null, reason: null, log: null };
    }
}