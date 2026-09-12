import { GAME_CONFIG } from '../helpers/constants.js';

/**
 * Gestiona todo el estado del flujo de turnos de una partida:
 * estado actual, número de turnos, flags de acción, contadores de
 * inactividad y ataques obligatorios, y bloqueos por animaciones.
 * No depende de Phaser: es lógica pura que la escena consulta.
 */
export default class TurnManager {
    /**
     * @param {{MANDATORY_ATTACK_TURN: number}} [config=GAME_CONFIG] Configuración de reglas.
     */
    constructor(config = GAME_CONFIG) {
        this.config = config;
        this.reset();
    }

    /**
     * Restaura el estado inicial del flujo de turnos.
     */
    reset() {
        this.state = 'pre-start'; // 'pre-start', 'player-turn', 'opponent-turn', 'game-over'
        this.playerHasActed = false;
        this.opponentHasActed = false;
        this.playerPerformedAttackThisTurn = false;
        this.opponentPerformedAttackThisTurn = false;
        this.playerTurnsSinceLastAttack = 0;
        this.opponentTurnsSinceLastAttack = 0;
        this.playerMustAttackThisTurn = false;
        this.opponentMustAttackThisTurn = false;
        this.playerTurnNumber = 0;
        this.opponentTurnNumber = 0;
        this.playerInactiveTurns = 0;
        this.opponentInactiveTurns = 0;
        this.blockingAnimations = 0;
        this.pendingTurnChange = null;
    }

    /**
     * Inicia el turno del jugador: avanza el contador, limpia flags
     * y calcula si esta obligado a atacar.
     * @returns {{turnNumber: number, mustAttack: boolean, turnsSinceLastAttack: number}}
     */
    beginPlayerTurn() {
        this.state = 'player-turn';
        this.playerTurnNumber++;
        this.playerHasActed = false;
        this.playerPerformedAttackThisTurn = false;
        this.playerMustAttackThisTurn = (this.playerTurnsSinceLastAttack >= this.config.MANDATORY_ATTACK_TURN - 1);
        return {
            turnNumber: this.playerTurnNumber,
            mustAttack: this.playerMustAttackThisTurn,
            turnsSinceLastAttack: this.playerTurnsSinceLastAttack
        };
    }

    /**
     * Inicia el turno del oponente: avanza el contador, limpia flags
     * y calcula si esta obligado a atacar.
     * @returns {{turnNumber: number, mustAttack: boolean, turnsSinceLastAttack: number}}
     */
    beginOpponentTurn() {
        this.state = 'opponent-turn';
        this.opponentTurnNumber++;
        this.opponentHasActed = false;
        this.opponentPerformedAttackThisTurn = false;
        this.opponentMustAttackThisTurn = (this.opponentTurnsSinceLastAttack >= this.config.MANDATORY_ATTACK_TURN - 1);
        return {
            turnNumber: this.opponentTurnNumber,
            mustAttack: this.opponentMustAttackThisTurn,
            turnsSinceLastAttack: this.opponentTurnsSinceLastAttack
        };
    }

    /**
     * Pone el flujo en estado de espera de turno del oponente (guest en LAN).
     */
    beginOpponentWait() {
        this.state = 'opponent-turn';
        return this.state;
    }

    /**
     * Solicita el fin de turno hacia `nextTurn`. Si hay animaciones
     * bloqueantes en curso, se registra como pendiente y devuelve false.
     * @param {'player'|'opponent'} nextTurn
     * @returns {boolean} `true` si se puede finalizar de inmediato.
     */
    requestTurnEnd(nextTurn) {
        if (this.blockingAnimations > 0) {
            this.pendingTurnChange = nextTurn;
            return false;
        }
        return true;
    }

    /**
     * Aplica la contabilidad de fin de turno para el jugador
     * (inactividad y ataques encadenados) y limpia la obligación de atacar.
     * Debe llamarse cuando el estado actual es 'player-turn' y no hay bloqueos.
     * @returns {{inactiveTurns: number, turnsSinceLastAttack: number}}
     */
    finishPlayerTurn() {
        if (!this.playerHasActed) {
            this.playerInactiveTurns++;
        } else {
            this.playerInactiveTurns = 0;
        }
        if (!this.playerPerformedAttackThisTurn) {
            this.playerTurnsSinceLastAttack++;
        } else {
            this.playerTurnsSinceLastAttack = 0;
        }
        this.playerMustAttackThisTurn = false;
        return {
            inactiveTurns: this.playerInactiveTurns,
            turnsSinceLastAttack: this.playerTurnsSinceLastAttack
        };
    }

    /**
     * Aplica la contabilidad de fin de turno para el oponente
     * (inactividad y ataques encadenados) y limpia la obligación de atacar.
     * @param {boolean} opponentActed Si el oponente realizó alguna acción este turno.
     * @returns {{inactiveTurns: number, turnsSinceLastAttack: number}}
     */
    finishOpponentTurn(opponentActed = false) {
        if (!opponentActed) {
            this.opponentInactiveTurns++;
        } else {
            this.opponentInactiveTurns = 0;
        }
        if (!this.opponentPerformedAttackThisTurn) {
            this.opponentTurnsSinceLastAttack++;
        } else {
            this.opponentTurnsSinceLastAttack = 0;
        }
        this.opponentMustAttackThisTurn = false;
        return {
            inactiveTurns: this.opponentInactiveTurns,
            turnsSinceLastAttack: this.opponentTurnsSinceLastAttack
        };
    }

    /**
     * Registra el inicio de una animación bloqueante.
     * @returns {number} El nuevo contador de animaciones bloqueantes.
     */
    onBlockingAnimationStarted() {
        this.blockingAnimations++;
        return this.blockingAnimations;
    }

    /**
     * Registra la finalización de una animación bloqueante. Si no quedan
     * bloqueos y había un cambio de turno pendiente, lo devuelve.
     * @returns {'player'|'opponent'|null} El próximo turno pendiente, si lo hay.
     */
    onBlockingAnimationCompleted() {
        this.blockingAnimations = Math.max(0, this.blockingAnimations - 1);
        if (this.blockingAnimations === 0 && this.pendingTurnChange) {
            const nextTurn = this.pendingTurnChange;
            this.pendingTurnChange = null;
            return nextTurn;
        }
        return null;
    }

    /**
     * Reinicia el contador de turnos sin atacar del jugador
     * (usado cuando se salta un turno por obligación de atacar sin cartas).
     */
    resetForcedAttackSkip() {
        this.playerTurnsSinceLastAttack = 0;
    }
}