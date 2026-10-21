import Player from '../game_objects/player.js';
import TurnManager from './TurnManager.js';
import EventBus from '../utils/eventBus.js';
import { GAME_CONFIG } from '../helpers/constants.js';
import { resolveCombat } from '../helpers/combat.js';
import VictoryEvaluator from './VictoryEvaluator.js';
import ConvergenceService from './ConvergenceService.js';
import PoderesRegistry from './powers/PoderesRegistry.js';

/**
 * Motor de partida (dominio puro). Es la única fuente de estado de una
 * partida: posee los jugadores, el flujo de turnos y la configuración, y
 * expone comandos que aplican reglas (victoria, convergencia, poderes de
 * esencia, combate) devolviendo resultados para que la capa de presentación
 * reaccione.
 *
 * Responsabilidad: concentrar las reglas del juego fuera de las Scenes.
 * Sin dependencias de Phaser: los cambios de estado se notifican vía un
 * EventBus propio que la escena puentea a su UI.
 */
export default class GameMatch {
/**
     * @param {object} [opts]
     * @param {object} [opts.config=GAME_CONFIG] Configuración de reglas.
     * @param {string} [opts.playerId='player']
     * @param {string} [opts.opponentId='opponent']
     * @param {object} [opts.turn=null] Flujo de turnos inyectado (DIP); si no
     *   se provee, crea un TurnManager por defecto.
     */
    constructor({
        config = GAME_CONFIG,
        playerId = 'player',
        opponentId = 'opponent',
        turn = null
    } = {}) {
        this.config = config;
        /** @type {import('../utils/eventBus.js').default */
        this.events = new EventBus();
        /** @type {import('../game_objects/player.js').default */
        this.player = new Player(playerId);
        /** @type {import('../game_objects/player.js').default */
        this.opponent = new Player(opponentId);
        /** @type {import('./TurnManager.js').default */
        this.turn = turn || new TurnManager(config);
    }

    /**
     * Devuelve el jugador por su id ('player' | 'opponent').
     * @param {string} id
     * @returns {Player}
     */
    playerOf(id) {
        return id === this.opponent.id ? this.opponent : this.player;
    }

    /**
     * Restaura el flujo de turnos al estado inicial.
     */
    reset() {
        this.turn.reset();
    }

    /**
     * Inicia el turno del jugador. Resuelve la Convergencia: si estaba armada
     * y el jugador conservó los 6 tipos, devuelve la victoria; si la perdió,
     * la cancela. En caso contrario delega en TurnManager.
     * @returns {{winner?: string, reason?: string, turnNumber: number, mustAttack: boolean, turnsSinceLastAttack: number}}
     */
    startPlayerTurn() {
        if (this.turn.playerConvergenceArmed) {
            if (ConvergenceService.isConverged(this.player.field.types(), this.config.UNIQUE_TYPES_TO_WIN)) {
                return { winner: 'player', reason: 'convergence' };
            }
            this.turn.playerConvergenceArmed = false;
            console.log('[GameMatch] Convergencia del jugador cancelada: perdió un tipo durante el turno rival.');
            this._emitConvergenceStatus();
        }
        return this.turn.beginPlayerTurn();
    }

    /**
     * Inicia el turno del oponente. Resuelve el poder ESPÍRITU (Conducto) y la
     * Convergencia rival. Si el oponente conservó los 6 tipos, devuelve victoria.
     * @returns {{winner?: string, reason?: string, turnNumber: number, mustAttack: boolean, turnsSinceLastAttack: number}}
     */
    startOpponentTurn() {
        if (this.turn.opponentConvergenceBlocked) {
            this.turn.opponentConvergenceBlocked = false;
            this.turn.opponentConvergenceArmed = false;
            console.log('[GameMatch] Conducto: la Convergencia del oponente queda anulada este turno.');
            this._emitConvergenceStatus();
        } else if (this.turn.opponentConvergenceArmed
            && ConvergenceService.isConverged(this.opponent.field.types(), this.config.UNIQUE_TYPES_TO_WIN)) {
            return { winner: 'opponent', reason: 'convergence' };
        }
        return this.turn.beginOpponentTurn();
    }

    /**
     * Sincroniza los flags de Convergencia de ambos jugadores con los tipos
     * únicos presentes en su campo.
     */
    syncConvergence() {
        this.turn.playerConvergenceArmed = ConvergenceService.isConverged(
            this.player.field.types(),
            this.config.UNIQUE_TYPES_TO_WIN
        );
        this.turn.opponentConvergenceArmed = ConvergenceService.isConverged(
            this.opponent.field.types(),
            this.config.UNIQUE_TYPES_TO_WIN
        );
        this._emitConvergenceStatus();
    }

    /**
     * Evalúa las condiciones de victoria al final de un turno.
     * @returns {string|null} 'player', 'opponent' o null.
     */
    checkVictoryConditions() {
        this.syncConvergence();
        const result = VictoryEvaluator.evaluate({
            player: this.player,
            opponent: this.opponent,
            turn: this.turn,
            config: this.config
        });
        if (result.log) console.log(result.log);
        return result.winner;
    }

    /**
     * Ejecuta el poder de esencia del jugador (clic en un orbe propio activo).
     * Obtiene el poder del registro y delega validación (EssencePowerService)
     * y ejecución. Uso: 1 por turno propio. Emite 'essence-power-used'.
     * @param {string} essenceType Tipo de esencia ('fuego', 'agua', ...).
     * @returns {{ok: boolean, reason?: string, essenceType?: string, name?: string, changed?: string[]}}
     */
    useEssencePower(essenceType) {
        if (this.turn.state !== 'player-turn') {
            console.log('[GameMatch] Solo puedes usar poderes de esencia en tu turno.');
            return { ok: false, reason: 'es-tu-turno' };
        }

        // OCP: GameMatch no conoce los poderes uno a uno; los obtiene del
        // registro y delega. Un poder nuevo = clase + entrada en el registro,
        // sin modificar este método.
        const poder = PoderesRegistry.get(essenceType);
        if (!poder) {
            console.warn('[GameMatch] Poder de esencia desconocido:', essenceType);
            return { ok: false, reason: 'tipo-desconocido' };
        }

        const ctx = {
            player: this.player,
            opponent: this.opponent,
            turn: this.turn,
            emitConvergenceStatus: () => this._emitConvergenceStatus()
        };

        const plan = poder.canUse(ctx);
        if (!plan.ok) {
            console.warn('[GameMatch] Poder de esencia no disponible:', { essenceType, reason: plan.reason });
            return { ok: false, reason: plan.reason };
        }

        this.turn.playerEssencePowerUsed = true;
        const changed = poder.execute(ctx) || [];

        this.events.emit('essence-power-used', { essenceType, name: plan.name });
        return { ok: true, essenceType, name: plan.name, changed };
    }

    /**
     * Resuelve (sin mutar) el combate entre una carta del jugador y una del
     * oponente. Aplica Ráfaga (empate -> victoria del atacante) si está activa.
     * @param {object} params
     * @param {number} params.attackerIndex Índice de la carta atacante en el campo.
     * @param {number} params.defenderIndex Índice de la carta defensora en el campo.
     * @returns {{result: object, attackerData: object, defenderData: object, attackerIndex: number, defenderIndex: number}|null}
     */
    resolvePlayerAttack({ attackerIndex, defenderIndex }) {
        if (this.turn.state !== 'player-turn') return null;
        const attackerData = this.player.field.get(attackerIndex);
        const defenderData = this.opponent.field.get(defenderIndex);
        if (!attackerData || !defenderData) return null;

        let result = resolveCombat(attackerData, defenderData);
        if (this.turn.playerNextAttackBreaksTie && result.winner === 'none') {
            console.log('[GameMatch] Ráfaga: el empate se convierte en victoria.');
            result = { winner: 'attacker', loser: 'defender' };
        }
        return { result, attackerData, defenderData, attackerIndex, defenderIndex };
    }

    /**
     * Consume la acción de ataque del jugador: marca que ha actuado, registra
     * el ataque y agota Ráfaga (el próximo ataque vuelve al comportamiento base).
     */
    markPlayerAttackConsumed() {
        this.turn.playerHasActed = true;
        this.turn.playerPerformedAttackThisTurn = true;
        this.turn.playerTurnsSinceLastAttack = 0;
        this.turn.playerNextAttackBreaksTie = false;
    }

    /**
     * Emite el estado de Convergencia a una eventual UI.
     */
    _emitConvergenceStatus() {
        this.events.emit('convergence-status', {
            player: this.turn.playerConvergenceArmed,
            opponent: this.turn.opponentConvergenceArmed
        });
    }
}