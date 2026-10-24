import { play as playSfx } from '../helpers/audioManager.js';
import {
    recordVictory,
    recordDefeat,
    recordFieldComplete,
    recordLevel3Win
} from '../helpers/playerProgress.js';
import { GAME_CONFIG } from '../helpers/constants.js';

/**
 * Controlador del ciclo de la partida.
 *
 * Responsabilidad agregada: gobernar el flujo de turnos (inicio/fin, temporizador,
 * contadores), evaluar la victoria y el fin de partida, aplicar los poderes de
 * esencia (delegando reglas en GameMatch) y coordinar la destrucción de cartas.
 * Es el puente entre el dominio (GameMatch) y la presentación (renderer/interacción).
 */
export default class TurnController {
    /**
     * @param {object} ctx Contexto compartido de la partida.
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.scene = ctx.scene;
        this.turnTimer = null; // Referencia al temporizador del turno
        this.matchTimer = null;
        this.matchTimeRemaining = 0;
        this.turnDeadline = null;
        this.matchDeadline = null;
        this._pendingDestroys = new Set(); // Destrucciones en curso (idempotencia)
    }

    /**
     * Inicia la partida cuando la UI lo solicita.
     */
    beginMatch() {
        const turn = this.ctx.turn;
        if (turn.state === 'pre-start') {
            console.log('[GameScene] ¡La partida ha comenzado!', { player: this.ctx.playerData?.username || 'Jugador' });
            if (this.startMatchTimer() === false) return;
            this.emitTurnCounters();

            // En modo LAN, solo el host comienza su turno, el guest espera
            if (this.ctx.isLAN) {
                if (this.ctx.playerRole === 'host') {
                    this.startPlayerTurn(this.ctx.gameStartData?.startedAt);
                } else {
                    // El guest espera su turno
                    turn.beginOpponentWait();
                    this.scene.events.emit('update-turn-indicator', 'opponent');
                    console.log('[GameScene] Esperando turno del oponente (eres guest)');
                }
            } else {
                // Modo local o vs bot: el jugador siempre empieza
                this.startPlayerTurn(this.ctx.gameStartData?.startedAt);
            }
        } else {
            console.log('[GameScene] start-game ignorado', { estadoActual: turn.state });
        }
    }

    /**
     * Inicia el turno del jugador, reseteando flags y activando el temporizador.
     */
    startPlayerTurn(turnStartedAt = null) {
        const { turn, interaction, player } = this.ctx;
        // El motor resuelve la Convergencia (victoria/cancelación) y arranca el turno.
        const start = this.ctx.match.startPlayerTurn();
        if (start && start.winner) {
            console.log('[GameScene] CONVERGENCIA: el jugador conservó los 6 tipos un turno completo.');
            this.endGame(start.winner);
            return;
        }

        console.log('[GameScene] Inicio del turno del JUGADOR', { turnNumber: turn.playerTurnNumber, mustAttack: turn.playerMustAttackThisTurn });
        this.emitTurnCounters();
        this.scene.events.emit('update-turn-indicator', 'player');
        // Emitimos el estado del contador obligatorio para que la UI lo muestre
        this.scene.events.emit('update-attack-counter', 'player', turn.playerTurnsSinceLastAttack + 1, turn.playerMustAttackThisTurn);
        // El cupo de acciones se repone completo: lo no usado se pierde.
        this.emitActionsLeft('player', turn.playerActionsLeft);

        // Procesar cooldowns y restricciones por nivel de las cartas del jugador
        interaction.preparePlayerFieldForTurn();

        this.startTurnTimer('player', turnStartedAt);

        // Si está obligado a atacar y NO tiene cartas en campo: saltar el turno y reiniciar contador.
        const playerHasFieldCards = player.field.hasAny();
        if (turn.playerMustAttackThisTurn && !playerHasFieldCards) {
            console.log('[GameScene] Obligado a atacar pero no tiene cartas -> salto de turno automático', { playerTurnsSinceLastAttack: turn.playerTurnsSinceLastAttack });
            // El salto forzado no cuenta como inactividad ni como turno sin atacar.
            this.endPlayerTurn(true);
            return;
        }
    }

    /**
     * Inicia y ejecuta la lógica del turno del oponente.
     */
    startOpponentTurn(turnStartedAt = null) {
        const { turn, interaction, botRunner } = this.ctx;
        // El motor aplica Conducto/Convergencia y arranca el turno del oponente.
        const start = this.ctx.match.startOpponentTurn();
        if (start && start.winner) {
            console.log('[GameScene] CONVERGENCIA: el oponente conservó los 6 tipos un turno completo.');
            this.endGame(start.winner);
            return;
        }
        this.emitTurnCounters();

        // Limpieza de restricciones de ataque por nivel al comenzar el turno (regla central en LevelAttackRule)
        interaction.prepareOpponentFieldForTurn();

        // El cupo de acciones del rival se repone completo al empezar su turno.
        this.emitActionsLeft('opponent', turn.opponentActionsLeft);
        this.startTurnTimer('opponent', turnStartedAt);

        // MODO LAN: no ejecutar IA, solo esperar acciones del oponente remoto
        if (this.ctx.isLAN) {
            console.log('[GameScene] Inicio del turno del OPONENTE (LAN) - esperando acción remota', { turnNumber: turn.opponentTurnNumber });
            this.scene.events.emit('update-turn-indicator', 'opponent');
            // El oponente jugará desde su cliente, los eventos llegarán por socket
            return;
        }

        // MODO BOT: ejecutar IA del oponente
        botRunner.run();
    }

    /**
     * Maneja el cambio de turno notificado por el servidor LAN.
     * @param {{currentTurn: string}} data
     */
    handleTurnChanged(data) {
        console.log('[GameScene] Cambio de turno recibido', { currentTurn: data.currentTurn, data });
        // Verificar si es nuestro turno
        if (data.currentTurn === this.ctx.playerRole) {
            this.startPlayerTurn(data.turnStartedAt);
        } else {
            this.startOpponentTurn(data.turnStartedAt);
        }
    }

    // Helper cuando se queda sin tiempo
    _playerTimedOut() {
        console.log('[GameScene] Tiempo agotado: el turno termina y las acciones sin usar se pierden', {
            turnNumber: this.ctx.turn.playerTurnNumber,
            actionsLeft: this.ctx.turn.playerActionsLeft
        });
        // Si estaba obligado a atacar y tenía cartas, se considera que NO atacó:
        // endPlayerTurn() aumentará su contador de turnos sin atacar (no lo reiniciamos).
        this.endPlayerTurn();
    }

    /**
     * Indica si el jugador puede gastar una acción ahora mismo: es su turno,
     * le queda cupo de acciones y no hay animaciones bloqueantes en curso.
     * @returns {boolean}
     */
    canPlayerActNow() {
        const { turn } = this.ctx;
        if (turn.state !== 'player-turn') return false;
        if (turn.blockingAnimations > 0) return false;
        return turn.canPlayerAct();
    }

    /**
     * Notifica a la UI cuántas acciones quedan disponibles.
     * @param {'player'|'opponent'} owner Dueño del turno.
     * @param {number} remaining Acciones restantes.
     */
    emitActionsLeft(owner, remaining) {
        this.scene.events.emit('update-actions-left', owner, remaining, this.ctx.match.config.ACTIONS_PER_TURN);
    }

    /**
     * Cierre de una acción del jugador (ataque, colocación o fusión).
     * La acción ya fue consumida en el dominio: aquí solo se informa a la UI
     * y, si no queda cupo, se termina el turno. Si hay animaciones bloqueantes
     * el fin de turno queda pendiente y se resuelve en animationComplete().
     * @returns {number} Acciones que quedan disponibles en el turno.
     */
    afterPlayerAction() {
        const { turn } = this.ctx;
        const remaining = turn.playerActionsLeft;
        const winner = this.checkVictoryConditions();
        if (winner) {
            this.endGame(winner, this.ctx.match.lastVictoryResult.reason);
            return remaining;
        }
        this.emitActionsLeft('player', remaining);
        if (remaining <= 0) {
            console.log('[GameScene] Cuota de acciones agotada: el turno del JUGADOR termina');
            this.endPlayerTurn();
        }
        return remaining;
    }

    /**
     * Finaliza el turno del jugador, ya sea por tiempo o por cuota de acciones agotada.
     * @param {boolean} [forcedAttackSkip=false] Si el turno se salta por obligación de atacar sin cartas.
     */
    endPlayerTurn(forcedAttackSkip = false) {
        const { turn, interaction } = this.ctx;
        if (turn.state !== 'player-turn') return;
        // Si hay animaciones en curso, solo marcamos el cambio de turno como pendiente.
        if (!turn.requestTurnEnd('opponent')) return;

        console.log('[GameScene] Fin del turno del JUGADOR', {
            actionsTaken: turn.playerActionsTaken,
            actionsUnused: turn.playerActionsLeft,
            performedAttack: turn.playerPerformedAttackThisTurn,
            turnNumber: turn.playerTurnNumber
        });

        this.clearTurnTimer();
        // Comprobamos inactividad y actualizamos contadores de ataque
        const turnReport = forcedAttackSkip
            ? turn.finishForcedAttackSkip()
            : turn.finishPlayerTurn();
        if (!turn.playerHasActed) {
            console.log('[GameScene] Jugador inactivo', { inactiveTurns: turnReport.inactiveTurns });
        }
        // Notificamos el contador a la UI
        this.scene.events.emit('update-attack-counter', 'player', turn.playerTurnsSinceLastAttack + 1, turn.playerMustAttackThisTurn);
        // Las acciones sin usar se pierden: el siguiente turno repone el cupo.
        this.emitActionsLeft('player', 0);

        // Deseleccionamos cualquier carta
        interaction.deselectCard(false);

        // Comprobamos condiciones de victoria antes de pasar el turno
        const winner = this.checkVictoryConditions();
        if (winner) {
            this.endGame(winner, this.ctx.match.lastVictoryResult.reason);
            return;
        }
        if (!winner && this.ctx.gameMode?.maxTurns
            && this.ctx.match.lastVictoryResult.reason === 'bothTurnLimits') {
            this.endGame(null, 'bothTurnLimits');
            return;
        }

        // En modo LAN, notificar al servidor del fin de turno
        if (this.ctx.isLAN && this.ctx.socket) {
            this.ctx.lan.emitEndTurn();
        }

        // En modo local o bot, iniciar turno del oponente directamente
        if (!this.ctx.isLAN) {
            this.scene.time.delayedCall(100, () => this.startOpponentTurn());
        }
        // En modo LAN, el evento 'turn_changed' del servidor iniciará el siguiente turno
    }

    /**
     * Finaliza el turno del oponente y devuelve el control al jugador, comprobando victoria.
     * @param {boolean|null} [opponentActed=null] - Si el oponente realizó alguna acción.
     *   Por defecto se deduce del contador de acciones consumidas.
     */
    endOpponentTurn(opponentActed = null) {
        const { turn } = this.ctx;
        if (turn.state !== 'opponent-turn') return;
        this.clearTurnTimer();

        const acted = opponentActed === null ? turn.opponentHasActed : opponentActed;
        // Comprobamos inactividad del oponente y actualizamos contadores de ataque
        const turnReport = turn.finishOpponentTurn(acted);
        if (!acted) {
            console.log('[GameScene] Oponente inactivo', { inactiveTurns: turnReport.inactiveTurns });
        }
        this.scene.events.emit('update-attack-counter', 'opponent', turn.opponentTurnsSinceLastAttack + 1, turn.opponentMustAttackThisTurn);
        this.emitActionsLeft('opponent', 0);

        // Comprobamos condiciones de victoria
        const winner = this.checkVictoryConditions();
        if (winner) {
            this.endGame(winner, this.ctx.match.lastVictoryResult.reason);
            return;
        }
        if (!winner && this.ctx.match.lastVictoryResult.reason === 'bothTurnLimits') {
            this.endGame(null, 'bothTurnLimits');
            return;
        }

        // En modo LAN, el servidor gestiona los turnos (no llamamos startPlayerTurn aquí)
        // En modo bot, sí llamamos startPlayerTurn
        if (!this.ctx.isLAN) {
            this.scene.time.delayedCall(100, () => this.startPlayerTurn());
        }
        // En modo LAN, esperamos el evento 'turn_changed' del servidor
    }

    /**
     * Se ejecuta en cada frame. Usado para actualizar el contador del temporizador.
     */
    update() {
        const { turn } = this.ctx;
        if (this.turnDeadline && (turn.state === 'player-turn' || turn.state === 'opponent-turn')) {
            const remainingTime = Math.max(0, Math.ceil((this.turnDeadline - Date.now()) / 1000));
            this.scene.events.emit('update-timer', turn.state === 'player-turn' ? remainingTime : 0);
        } else if (turn.state !== 'game-over') {
            // Si no es el turno del jugador, nos aseguramos que el timer esté en 0
            this.scene.events.emit('update-timer', 0);
        }
    }

    /**
     * Comprueba todas las condiciones de victoria al final de un turno.
     * Delegado en GameMatch (dominio).
     * @returns {string|null} 'player', 'opponent' o null.
     */
    checkVictoryConditions() {
        return this.ctx.match.checkVictoryConditions();
    }

    startMatchTimer() {
        const duration = this.ctx.gameMode?.matchTimeMs;
        if (!duration || this.matchTimer) return true;

        const serverStart = Number(this.ctx.gameStartData?.startedAt);
        const startedAt = Number.isFinite(serverStart) && serverStart > 0 ? serverStart : Date.now();
        this.matchDeadline = startedAt + duration;
        this.matchTimeRemaining = Math.max(0, Math.ceil((this.matchDeadline - Date.now()) / 1000));
        this.scene.events.emit('update-match-timer', this.matchTimeRemaining);
        if (this.matchTimeRemaining === 0) {
            this.endGame(null, 'timeExpired');
            return false;
        }
        this.matchTimer = setInterval(() => {
            if (this.ctx.turn.state === 'game-over') return;
            this.matchTimeRemaining = Math.max(0, Math.ceil((this.matchDeadline - Date.now()) / 1000));
            this.scene.events.emit('update-match-timer', this.matchTimeRemaining);
            if (this.matchTimeRemaining === 0) this.endGame(null, 'timeExpired');
        }, 200);
        return true;
    }

    emitTurnCounters() {
        const { turn } = this.ctx;
        this.scene.events.emit(
            'update-turn-counter',
            turn.playerTurnNumber,
            turn.opponentTurnNumber,
            this.ctx.gameMode?.maxTurns || null
        );
    }

    startTurnTimer(owner, turnStartedAt = null) {
        this.clearTurnTimer();
        const duration = this.ctx.match.config.TURN_TIME_LIMIT_MS;
        const serverStart = Number(turnStartedAt);
        const startedAt = Number.isFinite(serverStart) && serverStart > 0 ? serverStart : Date.now();
        this.turnDeadline = startedAt + duration;
        this.turnTimer = setInterval(() => {
            if (this.ctx.turn.state === 'game-over') return;
            if (Date.now() < this.turnDeadline) return;
            this.clearTurnTimer();
            if (owner === 'player' && this.ctx.turn.state === 'player-turn') {
                this._playerTimedOut();
            } else if (owner === 'opponent' && this.ctx.turn.state === 'opponent-turn') {
                this.endOpponentTurn(false);
            }
        }, 100);
    }

    clearTurnTimer() {
        if (this.turnTimer) clearInterval(this.turnTimer);
        this.turnTimer = null;
        this.turnDeadline = null;
    }

    /**
     * Ejecuta el poder de esencia solicitado por la UIScene (clic en un orbe
     * propio activo). Validación y efectos delegados en GameMatch (dominio);
     * la escena solo refresca la vista según el resultado.
     * Los poderes no gastan acciones del turno: gastan las gemas de su coste.
     * @param {string} essenceType Tipo de esencia ('fuego', 'agua', ...).
     */
    useEssencePower(essenceType) {
        const { match, player, opponent, renderer } = this.ctx;
        // El motor valida y aplica el efecto sobre el dominio; la escena refresca la vista.
        const outcome = match.useEssencePower(essenceType);
        if (!outcome) return;
        if (!outcome.ok) {
            // La UI explica por qué no se pudo activar (gemas, esencia, límite de usos).
            this.scene.events.emit('essence-power-failed', essenceType, outcome.reason, {
                name: outcome.name,
                gemCost: outcome.gemCost
            });
            return;
        }

        const changed = outcome.changed || [];
        if (changed.includes('player-hand')) renderer.refreshPlayerHand(player.hand);
        if (changed.includes('opponent-hand')) renderer.refreshOpponentHand(opponent.hand);
        if (changed.includes('deck')) renderer.updateDeckCounts(player.deck.getCardsCount(), opponent.deck.getCardsCount());
        if (changed.includes('reveal-opponent-hand')) renderer.revealOpponentHandForTurn();

        console.log('[GameScene] Poder de esencia usado:', outcome.name, 'de', essenceType, { gemCost: outcome.gemCost });
    }

    /**
     * Finaliza la partida y muestra un mensaje de victoria/derrota.
     * @param {string} winner El ganador de la partida ('player' u 'opponent').
     */
    endGame(winner, reason = null) {
        const { turn, player, playerData } = this.ctx;
        turn.state = 'game-over';
        this.clearTurnTimer();
        if (this.matchTimer) {
            clearInterval(this.matchTimer);
            this.matchTimer = null;
        }
        this.scene.events.emit('update-timer', 0); // Limpia el contador en la UI
        this.scene.events.emit('update-match-timer', 0);

        console.log('[GameScene] Fin de la partida. Ganador:', winner);

        // Progreso real: cada victoria/derrota se cuenta y alimenta misiones y logros.
        const username = (playerData && playerData.username) || 'Jugador';
        if (winner === 'player') {
            recordVictory(username);
            const fieldCards = player.field.cards();
            if (fieldCards.some(c => c && c.level >= 3)) {
                recordLevel3Win(username);
            }
            const fieldTypes = new Set(fieldCards.map(c => c && c.type).filter(Boolean));
            if (fieldTypes.size >= GAME_CONFIG.UNIQUE_TYPES_TO_WIN) {
                recordFieldComplete(username);
            }
        } else if (winner === 'opponent') {
            recordDefeat(username);
        }

        // Efecto de sonido de victoria/derrota según el resultado.
        if (winner === 'player') playSfx('victory', this.scene);
        else if (winner === 'opponent') playSfx('defeat', this.scene);

        // Desactivamos toda la interactividad para que no se pueda seguir jugando.
        this.scene.input.enabled = false;

        // Emitimos un evento para que la UIScene muestre la pantalla de fin de juego.
        this.scene.events.emit('game-over', winner, reason);
    }

    /**
     * Destruye una carta del campo de forma robusta.
     * Acepta instanceId opcional para desambiguar si el modelo y la vista se desincronizan.
     */
    destroyCard(owner, fieldIndex, instanceId = null) {
        const { turn, player, opponent, renderer, debugSync } = this.ctx;
        if (debugSync) console.log('[GameScene][debug] destroyCard called', { owner: owner && owner.id, fieldIndex, instanceId, timestamp: Date.now() });
        // Intentar obtener cardData desde el modelo
        let cardData = (typeof fieldIndex === 'number' && owner.field.get(fieldIndex)) ? owner.field.get(fieldIndex) : null;

        // si hay instanceId y el modelo no coincide, buscar en el modelo por instanceId
        if ((!cardData || (instanceId && cardData.instanceId !== instanceId)) && instanceId) {
            const foundIdx = owner.field.findIndexByCard(instanceId);
            if (foundIdx !== -1) {
                fieldIndex = foundIdx;
                cardData = owner.field.get(fieldIndex);
            }
        }

        // Si aún no encontramos, intentar localizar objeto visual por instanceId
        let cardObject = null;
        if (instanceId) {
            cardObject = this.scene.children.list.find(child => {
                const cd = (child.getData && child.getData('cardData')) || child.cardData;
                if (!cd || !cd.instanceId) return false;
                const ownerMatch = (owner.id === 'player') ? child.getData('isCardOnField') && !child.getData('isOpponentCard') : child.getData('isOpponentCard') && child.getData('isCardOnField');
                return ownerMatch && cd.instanceId === instanceId;
            });
        }

        // Determinar instanceId definitivo (modelo o argumento)
        const modelInstanceId = cardData && cardData.instanceId;
        const finalInstanceId = instanceId || modelInstanceId || (cardObject && cardObject.getData && cardObject.getData('cardData') && cardObject.getData('cardData').instanceId) || null;

        // Idempotencia: si ya está en proceso de destrucción, ignorar
        if (finalInstanceId) {
            if (this._pendingDestroys.has(finalInstanceId)) {
                console.log('[GameScene] destroyCard: ya en proceso de destrucción, se ignora petición duplicada', { instanceId: finalInstanceId });
                return;
            }
        }

        // Si no encontramos por instanceId, buscar por índice/propiedad owner
        if (!cardObject && typeof fieldIndex === 'number') {
            const isOpponentCard = owner.id === 'opponent';
            cardObject = this.scene.children.list.find(child => {
                // Asegurarse de que el objeto tiene el método getData antes de usarlo
                if (!child.getData) return false;
                // Obtener si el objeto visual es del oponente
                if (!child.getData) return false;
                const childIsOpponent = !!child.getData('isOpponentCard');
                // La búsqueda ahora es estricta: el índice y el propietario deben coincidir
                return child.getData('fieldIndex') === fieldIndex && child.getData('isCardOnField') && childIsOpponent === isOpponentCard;
            });
        }

        // Si no hay modelo ni objeto visual, registrar y salir
        if (!cardData && !cardObject) {
            console.warn(`[GameScene] destroyCard fallo: no existe modelo ni visual para owner=${owner.id} slot=${fieldIndex} id=${instanceId}`);
            // intentar buscar visual por índice
            const fallback = this.scene.children.list.find(child => {
                try { return child.getData && child.getData('fieldIndex') === fieldIndex; } catch { return false; }
            });
            if (fallback && fallback.destroy) {
                console.log('[GameScene] destroyCard: eliminando visual fallback en índice', fieldIndex);
                fallback.destroy();
            }
            // limpiar modelo si había mismatch
            if (typeof fieldIndex === 'number' && owner.field.get(fieldIndex)) {
                console.log('[GameScene] destroyCard: limpiando modelo en slot', fieldIndex);
                owner.field.clearAt(fieldIndex);
            }
            return;
        }

        // Si tenemos modelo pero no objeto visual, intentar borrar solo modelo
        if (cardData && !cardObject) {
            console.warn('[GameScene] destroyCard: objeto visual no encontrado. Actualizando solamente el modelo.', { owner: owner.id, fieldIndex, cardData });
            // Marcar como en proceso para evitar reentradas
            if (finalInstanceId) this._pendingDestroys.add(finalInstanceId);

            // llevar carta(s) al cementerio según nivel
            owner.addCardDataToGraveyard(cardData);

            if (typeof fieldIndex === 'number') owner.field.clearAt(fieldIndex);
            if (owner.id === 'player') renderer.refreshPlayerHand(player.hand);
            renderer.updateDeckCounts(player.deck.getCardsCount(), opponent.deck.getCardsCount());

            if (finalInstanceId) this._pendingDestroys.delete(finalInstanceId);
            return;
        }

        // Variables de coordinación para la destrucción (visuales y modelo)
        let visualDestroyed = false;
        let modelCleaned = false;

        const finalizePending = () => {
            if (finalInstanceId) {
                this._pendingDestroys.delete(finalInstanceId);
                console.log('[GameScene] destroyCard: limpieza pending completa', { instanceId: finalInstanceId });
            }
        };

        const tryFinalize = () => {
            if (visualDestroyed && modelCleaned) finalizePending();
        };

        // Destrucción visual con animación si existe
        if (cardObject) {
            // Marcar como en proceso antes de iniciar la animación
            if (finalInstanceId) this._pendingDestroys.add(finalInstanceId);
            // Verificar coherencia entre owner y metadata del objeto visual
            try {
                const objIsOpponent = !!cardObject.getData('isOpponentCard');
                const ownerShouldBeOpponent = owner.id === 'opponent';
                if (objIsOpponent !== ownerShouldBeOpponent) {
                    console.warn('[GameScene] destroyCard: mismatch owner vs visual metadata. Intentando localizar objeto correcto.', { owner: owner.id, fieldIndex, objIsOpponent });
                    // Intentar localizar visual correcto por instanceId si existe
                    const cd = (cardObject.getData && cardObject.getData('cardData')) || cardObject.cardData;
                    const instanceToFind = (cd && cd.instanceId) || instanceId;
                    if (instanceToFind) {
                        const corrected = this.scene.children.list.find(child => {
                            const ccd = (child.getData && child.getData('cardData')) || child.cardData;
                            if (!ccd || !ccd.instanceId) return false;
                            const ownerMatch = (owner.id === 'player') ? child.getData('isCardOnField') && !child.getData('isOpponentCard') : child.getData('isOpponentCard') && child.getData('isCardOnField');
                            return ccd.instanceId === instanceToFind && ownerMatch;
                        });
                        if (corrected) {
                            console.log('[GameScene] destroyCard: encontrado objeto corregido por instanceId.', { name: corrected.name, fieldIndex: corrected.getData('fieldIndex') });
                            cardObject = corrected;
                        } else {
                            // Intentar encontrar flipping owner (maybe owner arg was inverted)
                            const flippedOwner = owner.id === 'player' ? opponent : player;
                            const flippedObj = this.scene.children.list.find(child => child.getData && child.getData('fieldIndex') === fieldIndex && ((flippedOwner.id === 'player' && !child.getData('isOpponentCard')) || (flippedOwner.id === 'opponent' && child.getData('isOpponentCard'))));
                            if (flippedObj) {
                                console.log('[GameScene] destroyCard: encontrado objeto en flipped owner, corrigiendo owner.', { flippedOwner: flippedOwner.id, foundName: flippedObj.name });
                                owner = flippedOwner;
                                cardObject = flippedObj;
                            }
                        }
                    }
                }
            } catch { /* ignore metadata check errors */ }

            turn.onBlockingAnimationStarted();
            console.log('[GameScene] Animación de destrucción iniciada. Bloqueos activos:', turn.blockingAnimations);
            console.log('[GameScene] destroyCard: iniciando efecto de destrucción', { owner: owner.id, fieldIndex, instanceId: finalInstanceId });

            // La carta se desvanece girando mientras emite partículas de su elemento.
            const fxCardData = (cardObject.getData && cardObject.getData('cardData')) || cardObject.cardData || cardData;

            // El bloqueo se libera SIEMPRE vía timer de seguridad: si la carta se
            // destruye antes de que el tween termine, Phaser descarta el onComplete
            // y blockingAnimations quedaría > 0 para siempre (pantalla congelada).
            let deathFinished = false;
            const finishDeath = () => {
                if (deathFinished) return;
                deathFinished = true;
                console.log('[GameScene] destroyCard: destrucción visual completada', { name: cardObject && cardObject.name, fieldIndex });
                if (cardObject && cardObject.active && cardObject.destroy) cardObject.destroy();
                visualDestroyed = true;
                this.animationComplete();
                tryFinalize();
            };

            renderer.playDeath(cardObject, fxCardData, finishDeath);

            // Red de seguridad: la animación dura 340 ms; 650 ms lo cubre con margen.
            this.scene.time.delayedCall(650, finishDeath);
        }

        // Si tenemos modelo, mover a cementerio con la misma lógica previa
        if (cardData) {
            owner.addCardDataToGraveyard(cardData);
            if (typeof fieldIndex === 'number') {
                console.log('[GameScene] destroyCard: limpiando modelo (owner.field) en slot', fieldIndex, 'valor previo:', owner.field.get(fieldIndex));
                owner.field.clearAt(fieldIndex);
                modelCleaned = true;
                tryFinalize();
            }
        }

        // Restaurar interactividad del slot si era del jugador
        if (owner.id === 'player' && typeof fieldIndex === 'number') {
            const slot = this.scene['player_battle_slots'][fieldIndex];
            if (slot) {
                // Asegurarnos de restaurar como dropZone para permitir jugar cartas en él
                try { slot.setInteractive({ dropZone: true }); } catch { slot.setInteractive(); }
            }
            renderer.refreshPlayerHand(player.hand);
        }

        renderer.updateDeckCounts(player.deck.getCardsCount(), opponent.deck.getCardsCount());
    }

    /**
     * Se llama cuando una animación bloqueante finaliza. Decrementa el contador
     * y, si no quedan más bloqueos, intenta avanzar al siguiente turno.
     */
    animationComplete() {
        const { turn } = this.ctx;
        const nextTurn = turn.onBlockingAnimationCompleted();
        console.log('[GameScene] Animación completada. Bloqueos restantes:', turn.blockingAnimations);

        // Si no hay más animaciones y hay un cambio de turno pendiente...
        if (nextTurn) {
            console.log(`[GameScene] Todas las animaciones completadas. Procediendo al turno de: ${nextTurn}`);
            if (nextTurn === 'player') this.endOpponentTurn();
            else if (nextTurn === 'opponent') this.endPlayerTurn();
        }
    }

    /**
     * Destruye los temporizadores de turno y partida al apagar la escena.
     */
    destroyTimer() {
        this.clearTurnTimer();
        if (this.matchTimer) clearInterval(this.matchTimer);
        this.matchTimer = null;
    }
}
