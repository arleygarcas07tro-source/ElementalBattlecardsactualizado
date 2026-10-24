import { GAME_CONFIG } from '../helpers/constants.js';

const REASON_LOGS = {
    playerInactive: '[GameScene] VICTORIA: OPONENTE (inactividad del jugador)',
    opponentInactive: '[GameScene] VICTORIA: JUGADOR (inactividad del oponente)',
    playerEssences: '[GameScene] VICTORIA: JUGADOR (llenó las 6 esencias)',
    opponentEssences: '[GameScene] VICTORIA: OPONENTE (llenó las 6 esencias)',
    playerObjectives: '[GameScene] VICTORIA: JUGADOR (gemas + control de campo)',
    opponentObjectives: '[GameScene] VICTORIA: OPONENTE (gemas + control de campo)',
    playerTurnLimit: '[GameScene] LÍMITE: el jugador agotó sus turnos',
    opponentTurnLimit: '[GameScene] LÍMITE: el oponente agotó sus turnos',
    bothTurnLimits: '[GameScene] EMPATE: ambos jugadores agotaron sus turnos',
    timeExpired: '[GameScene] EMPATE: tiempo agotado sin ganador (ambos pierden)'
};

/**
 * Evaluador puro de condiciones de victoria. Recibe los estados del jugador,
 * oponente, turno, gemas y modo de juego, y decide si hay ganador y por qué.
 * Sin dependencias de Phaser.
 *
 * NOTA: en modo clásico la victoria por control de campo (6 tipos) NO se
 * evalúa aquí: vive en ConvergenceService + GameMatch, porque ya no es
 * instantánea (exige conservar los 6 tipos durante un turno rival completo).
 * Los modos con gemas/contrarreloj/turnos máximos sí se evalúan aquí.
 */
export default class VictoryEvaluator {
    /**
     * Evalúa las condiciones de victoria.
     * @param {{
     *   player: object,
     *   opponent: object,
     *   turn: object,
     *   config?: object,
     *   gems?: {player: object, opponent: object}|null,
     *   mode?: object|null,
     *   timeExpired?: boolean
     * }} ctx
     * @returns {{ winner: string|null, reason: string|null, log: string|null }}
     */
    static evaluate({ player, opponent, turn, config = GAME_CONFIG, gems = null, mode = null, timeExpired = false }) {
        // 0) Tiempo agotado (contrarreloj): ambos pierden.
        if (timeExpired) {
            return { winner: null, reason: 'timeExpired', log: REASON_LOGS.timeExpired };
        }

        // 1) Inactividad (regla original, aplica en todos los modos).
        if (turn.playerInactiveTurns >= config.INACTIVE_TURNS_TO_LOSE) {
            return { winner: 'opponent', reason: 'playerInactive', log: REASON_LOGS.playerInactive };
        }
        if (turn.opponentInactiveTurns >= config.INACTIVE_TURNS_TO_LOSE) {
            return { winner: 'player', reason: 'opponentInactive', log: REASON_LOGS.opponentInactive };
        }

        // Compatible con Battlefield (dominio) y con arreglos crudos (tests/legacy).
        const fieldTypeCount = (p) => {
            if (!p || !p.field) return 0;
            if (typeof p.field.types === 'function') return p.field.types().size;
            if (Array.isArray(p.field)) return new Set(p.field.filter(c => c).map(c => c.type)).size;
            return 0;
        };
        const usesGems = !!(mode && mode.usesGems && gems);

        // 2) Objetivo del modo con gemas: reunir las gemas Y dominar los 6 elementos.
        if (usesGems) {
            if (gems.player.meetsAll() && fieldTypeCount(player) >= config.UNIQUE_TYPES_TO_WIN) {
                return { winner: 'player', reason: 'playerObjectives', log: REASON_LOGS.playerObjectives };
            }
            if (gems.opponent.meetsAll() && fieldTypeCount(opponent) >= config.UNIQUE_TYPES_TO_WIN) {
                return { winner: 'opponent', reason: 'opponentObjectives', log: REASON_LOGS.opponentObjectives };
            }
        } else {
            // Modo clásico: el control de campo lo resuelve ConvergenceService
            // (no es instantáneo). Solo cuentan las esencias aquí.
            if (player.essences.size >= config.ESSENCES_TO_WIN) {
                return { winner: 'player', reason: 'playerEssences', log: REASON_LOGS.playerEssences };
            }
            if (opponent.essences.size >= config.ESSENCES_TO_WIN) {
                return { winner: 'opponent', reason: 'opponentEssences', log: REASON_LOGS.opponentEssences };
            }
        }

        // 3) Límite de turnos propios (modo 30 turnos).
        if (mode && mode.maxTurns) {
            if (turn.playerTurnNumber >= mode.maxTurns && turn.opponentTurnNumber >= mode.maxTurns) {
                return { winner: null, reason: 'bothTurnLimits', log: REASON_LOGS.bothTurnLimits };
            }
            if (turn.playerTurnNumber >= mode.maxTurns) {
                return { winner: null, reason: 'playerTurnLimit', log: REASON_LOGS.playerTurnLimit };
            }
            if (turn.opponentTurnNumber >= mode.maxTurns) {
                return { winner: null, reason: 'opponentTurnLimit', log: REASON_LOGS.opponentTurnLimit };
            }
        }

        return { winner: null, reason: null, log: null };
    }
}
