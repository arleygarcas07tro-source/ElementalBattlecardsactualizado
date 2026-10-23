import { GAME_CONFIG } from '../helpers/constants.js';

/**
 * Gestiona todo el estado del flujo de turnos de una partida:
 * estado actual, número de turnos, cupo de acciones por turno, contadores de
 * inactividad y ataques obligatorios, y bloqueos por animaciones.
 * No depende de Phaser: es lógica pura que la escena consulta.
 */
export default class TurnManager {
    /**
     * @param {{MANDATORY_ATTACK_TURN: number, ACTIONS_PER_TURN: number}} [config=GAME_CONFIG]
     *   Configuración de reglas.
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
        // Cupo de acciones del turno (atacar, colocar o fusionar). Se repone
        // completo en cada turno: las acciones no usadas se pierden.
        this.playerActionsLeft = this.config.ACTIONS_PER_TURN;
        this.opponentActionsLeft = this.config.ACTIONS_PER_TURN;
        this.playerActionsTaken = 0;
        this.opponentActionsTaken = 0;
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
        // Poderes de esencia: usos por poder en el turno propio (cada poder
        // define su propio límite y su coste en gemas).
        this.playerPowerUses = {};
        this.opponentPowerUses = {};
        // Poder FUEGO (Ráfaga): el próximo ataque del jugador rompe el empate.
        this.playerNextAttackBreaksTie = false;
        // Convergencia (victoria por 6 tipos): el jugador armó los 6 tipos y debe
        // conservarlos durante el turno rival para ganar.
        this.playerConvergenceArmed = false;
        this.opponentConvergenceArmed = false;
        // Poder ESPÍRITU (Conducto): bloquea la convergencia del rival 1 turno.
        this.opponentConvergenceBlocked = false;
    }

    /**
     * Indica si el jugador ya gastó al menos una acción en su turno.
     * @returns {boolean}
     */
    get playerHasActed() {
        return this.playerActionsTaken > 0;
    }

    /**
     * Indica si el oponente ya gastó al menos una acción en su turno.
     * @returns {boolean}
     */
    get opponentHasActed() {
        return this.opponentActionsTaken > 0;
    }

    /**
     * Acciones restantes del jugador en su turno.
     * @returns {number}
     */
    get playerActionsRemaining() {
        return this.playerActionsLeft;
    }

    /**
     * Acciones restantes del oponente en su turno.
     * @returns {number}
     */
    get opponentActionsRemaining() {
        return this.opponentActionsLeft;
    }

    /**
     * Inicia el turno del jugador: avanza el contador, repone el cupo de
     * acciones, limpia flags y calcula si está obligado a atacar.
     * @returns {{turnNumber: number, mustAttack: boolean, turnsSinceLastAttack: number, actionsLeft: number}}
     */
    beginPlayerTurn() {
        this.state = 'player-turn';
        this.playerTurnNumber++;
        // El cupo se repone completo: las acciones del turno anterior no se acumulan.
        this.playerActionsLeft = this.config.ACTIONS_PER_TURN;
        this.playerActionsTaken = 0;
        this.playerPerformedAttackThisTurn = false;
        this.playerPowerUses = {};
        this.playerMustAttackThisTurn = (this.playerTurnsSinceLastAttack >= this.config.MANDATORY_ATTACK_TURN - 1);
        return {
            turnNumber: this.playerTurnNumber,
            mustAttack: this.playerMustAttackThisTurn,
            turnsSinceLastAttack: this.playerTurnsSinceLastAttack,
            actionsLeft: this.playerActionsLeft
        };
    }

    /**
     * Inicia el turno del oponente: avanza el contador, repone el cupo de
     * acciones, limpia flags y calcula si está obligado a atacar.
     * @returns {{turnNumber: number, mustAttack: boolean, turnsSinceLastAttack: number, actionsLeft: number}}
     */
    beginOpponentTurn() {
        this.state = 'opponent-turn';
        this.opponentTurnNumber++;
        // El cupo se repone completo: las acciones del turno anterior no se acumulan.
        this.opponentActionsLeft = this.config.ACTIONS_PER_TURN;
        this.opponentActionsTaken = 0;
        this.opponentPerformedAttackThisTurn = false;
        this.opponentPowerUses = {};
        this.opponentMustAttackThisTurn = (this.opponentTurnsSinceLastAttack >= this.config.MANDATORY_ATTACK_TURN - 1);
        return {
            turnNumber: this.opponentTurnNumber,
            mustAttack: this.opponentMustAttackThisTurn,
            turnsSinceLastAttack: this.opponentTurnsSinceLastAttack,
            actionsLeft: this.opponentActionsLeft
        };
    }

    /**
     * Indica si el jugador puede gastar una acción ahora mismo.
     * @returns {boolean}
     */
    canPlayerAct() {
        return this.state === 'player-turn' && this.playerActionsLeft > 0;
    }

    /**
     * Indica si el oponente puede gastar una acción ahora mismo.
     * @returns {boolean}
     */
    canOpponentAct() {
        return this.state === 'opponent-turn' && this.opponentActionsLeft > 0;
    }

    /**
     * Gasta una acción del jugador (ataque, colocación o fusión).
     * Una fusión cuenta como una sola acción aunque combine varias cartas.
     * @returns {number} Acciones que quedan disponibles en el turno.
     */
    consumePlayerAction() {
        if (this.playerActionsLeft <= 0) return 0;
        this.playerActionsLeft -= 1;
        this.playerActionsTaken += 1;
        return this.playerActionsLeft;
    }

    /**
     * Gasta una acción del oponente (ataque, colocación o fusión).
     * @returns {number} Acciones que quedan disponibles en el turno.
     */
    consumeOpponentAction() {
        if (this.opponentActionsLeft <= 0) return 0;
        this.opponentActionsLeft -= 1;
        this.opponentActionsTaken += 1;
        return this.opponentActionsLeft;
    }

    /**
     * Usos de un poder de esencia en el turno del jugador.
     * @param {string} type Tipo de esencia ('fuego', 'agua', ...).
     * @returns {number}
     */
    getPowerUses(type) {
        return this.playerPowerUses[type] || 0;
    }

    /**
     * Registra el uso de un poder de esencia en el turno del jugador.
     * @param {string} type Tipo de esencia ('fuego', 'agua', ...).
     * @returns {number} Total de usos del poder en este turno.
     */
    registerPowerUse(type) {
        this.playerPowerUses[type] = this.getPowerUses(type) + 1;
        return this.playerPowerUses[type];
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
     * @returns {{inactiveTurns: number, turnsSinceLastAttack: number, actionsLeft: number}}
     */
    finishPlayerTurn() {
        if (this.playerActionsTaken === 0) {
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
            turnsSinceLastAttack: this.playerTurnsSinceLastAttack,
            actionsLeft: this.playerActionsLeft
        };
    }

    /**
     * Aplica la contabilidad de fin de turno para el oponente
     * (inactividad y ataques encadenados) y limpia la obligación de atacar.
     * @param {boolean} [opponentActed] Si el oponente realizó alguna acción este turno.
     * @returns {{inactiveTurns: number, turnsSinceLastAttack: number, actionsLeft: number}}
     */
    finishOpponentTurn(opponentActed = this.opponentActionsTaken > 0) {
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
            turnsSinceLastAttack: this.opponentTurnsSinceLastAttack,
            actionsLeft: this.opponentActionsLeft
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
     * Contabilidad del turno saltado por obligación de atacar sin cartas en campo.
     * No incrementa la inactividad ni el contador de turnos sin atacar:
     * el salto es forzado, no es una acción voluntaria del jugador.
     * @returns {{inactiveTurns: number, turnsSinceLastAttack: number, actionsLeft: number}}
     */
    finishForcedAttackSkip() {
        this.playerActionsTaken = Math.max(this.playerActionsTaken, 1);
        if (this.playerActionsLeft === this.config.ACTIONS_PER_TURN) {
            this.playerActionsLeft = 0;
        }
        this.playerInactiveTurns = 0;
        this.playerTurnsSinceLastAttack = 0;
        this.playerMustAttackThisTurn = false;
        return {
            inactiveTurns: this.playerInactiveTurns,
            turnsSinceLastAttack: this.playerTurnsSinceLastAttack,
            actionsLeft: this.playerActionsLeft
        };
    }
}