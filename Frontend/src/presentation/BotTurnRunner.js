import { resolveCombat } from '../helpers/combat.js';
import { GAME_CONFIG } from '../helpers/constants.js';

/**
 * Ejecutor del turno del bot.
 *
 * Responsabilidad agregada: construir el contexto de decisión a partir del
 * tablero y ejecutar el plan devuelto por la IA (BotAI), aplicando el modelo de
 * dominio y encargando las animaciones al BoardRenderer. Mantiene a la escena
 * y al controlador de turnos libres de la lógica de la IA.
 */
export default class BotTurnRunner {
    /**
     * @param {object} ctx Contexto compartido de la partida.
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.scene = ctx.scene;
    }

    /**
     * Ejecuta el turno completo del bot: espera su retardo y aplica acciones
     * hasta agotar el cupo del turno (o quedarse sin opciones).
     */
    run() {
        const { turn, bot } = this.ctx;
        console.log('[GameScene] IA del oponente evaluando acciones (BOT)', { turnNumber: turn.opponentTurnNumber });

        bot.refreshActionDelay();
        bot.refreshScoreModifier();

        this.scene.time.delayedCall(bot.actionDelay, () => this.runNextAction());
    }

    /**
     * Ejecuta la siguiente acción del bot. Si el plan falla, reevalúa hasta
     * agotar el margen de seguridad; si no queda cupo de acciones, cierra turno.
     */
    runNextAction() {
        const { turn, bot, turnController } = this.ctx;
        if (turn.state !== 'opponent-turn') return;
        if (!turn.canOpponentAct()) {
            turnController.endOpponentTurn();
            return;
        }

        // Revalúa el plan mientras el plan falle (ej. fusión inválida) hasta ejecutar una acción.
        let safety = 10;
        let executed = false;
        while (!executed && safety-- > 0) {
            const plan = bot.decideAction(this.buildContext());
            executed = this.executePlan(plan);
        }
        if (!executed) {
            turnController.endOpponentTurn(false);
        }
    }

    /**
     * Continúa el turno del bot tras una acción ejecutada: si le queda cupo
     * decide la siguiente acción; si no, cierra el turno.
     */
    continueTurn() {
        const { turn, turnController } = this.ctx;
        const winner = turnController.checkVictoryConditions();
        if (winner) {
            turnController.endGame(winner, this.ctx.match.lastVictoryResult.reason);
            return;
        }
        if (this.ctx.match.lastVictoryResult.reason === 'bothTurnLimits') {
            turnController.endGame(null, 'bothTurnLimits');
            return;
        }
        if (!turn.canOpponentAct()) {
            turnController.endOpponentTurn();
            return;
        }
        // Pausa breve para que el jugador vea la animación antes de la 2ª acción.
        this.scene.time.delayedCall(GAME_CONFIG.BOT_NEXT_ACTION_DELAY_MS, () => {
            if (this.ctx.turn.state !== 'opponent-turn') return;
            this.runNextAction();
        });
    }

    /**
     * Construye el contexto de decisión del bot a partir del tablero (modelo + objetos visuales).
     * @returns {object} Contexto consumible por BotAI.decideAction.
     */
    buildContext() {
        const { turn, opponent, player } = this.ctx;
        const fieldCardObjects = this.scene.children.list.filter(c => c.getData('isCardOnField'));
        const opponentAttackers = fieldCardObjects
            .filter(c => c.getData('isOpponentCard') && c.getData('blockedTurn') !== turn.opponentTurnNumber)
            .map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));
        const bestAttackPool = fieldCardObjects
            .filter(c => c.getData('isOpponentCard') && (c.getData('cooldown') || 0) === 0 && c.getData('blockedTurn') !== turn.opponentTurnNumber)
            .map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));
        const playerFieldCards = fieldCardObjects
            .filter(c => !c.getData('isOpponentCard'))
            .map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));
        return {
            opponent,
            mustAttack: turn.opponentMustAttackThisTurn,
            playerHasField: player.field.hasAny(),
            opponentAttackers,
            bestAttackPool,
            revealedDefenders: playerFieldCards.filter(pair => {
                const obj = this.scene.children.list.find(c => c.getData('isCardOnField') && !c.getData('isOpponentCard') && c.getData('fieldIndex') === pair.index);
                return !!obj && obj.getData('isRevealed');
            }),
            playerFieldCards
        };
    }

    /**
     * Ejecuta el plan de acción decidido por el bot. Devuelve true si la acción
     * se ejecutó (terminando el turno del oponente) o false si falló/sin acción.
     * @param {object} plan Plan devuelto por BotAI.decideAction.
     * @returns {boolean}
     */
    executePlan(plan) {
        switch (plan.kind) {
            case 'fusion': return this.executeFusion(plan);
            case 'attack': return this.executeAttack(plan);
            case 'directAttack': return this.executeDirectAttack(plan);
            case 'playCard': return this.executePlayCard(plan);
            default: return false; // pass
        }
    }

    /**
     * Busca el objeto visual de una carta del oponente (en campo) por su índice de slot.
     * @param {number} fieldIndex Índice de slot del campo del oponente.
     * @returns {object|null}
     */
    findOpponentCardObject(fieldIndex) {
        return this.scene.children.list.find(c => c.getData('isOpponentCard') && c.getData('isCardOnField') && c.getData('fieldIndex') === fieldIndex);
    }

    /**
     * Busca el objeto visual de una carta del jugador (en campo) por su índice de slot.
     * @param {number} fieldIndex Índice de slot del campo del jugador.
     * @returns {object|null}
     */
    findPlayerCardObject(fieldIndex) {
        return this.scene.children.list.find(c => !c.getData('isOpponentCard') && c.getData('isCardOnField') && c.getData('fieldIndex') === fieldIndex);
    }

    /**
     * Ejecuta la fusión de campo decidida por el bot.
     * @param {object} plan Plan { kind: 'fusion', indices: number[] }.
     * @returns {boolean} true si la fusión se ejecutó.
     */
    executeFusion(plan) {
        const { opponent, renderer, debugSync } = this.ctx;
        if (debugSync) console.log('[GameScene][debug] Oponente BOT fusionando campo', { indices: plan.indices, timestamp: Date.now() });
        const [idxA, idxB] = plan.indices;
        const origA = opponent.field.get(idxA);
        const origB = opponent.field.get(idxB);
        const res = opponent.fuseCards(idxA, idxB);
        if (!res || !res.newCard) return false;
        let targetIndex = null;
        if (typeof res.emptiedIndex === 'number') {
            targetIndex = [idxA, idxB].find(i => i !== res.emptiedIndex);
        } else if (typeof res.targetIndex === 'number') {
            targetIndex = res.targetIndex;
        } else {
            targetIndex = idxB;
        }
        const idsToRemove = [
            origA && origA.instanceId ? origA.instanceId : null,
            origB && origB.instanceId ? origB.instanceId : null
        ].filter(Boolean);
        idsToRemove.forEach(id => {
            const obj = this.scene.children.list.find(child => {
                const cd = child.getData('cardData') || child.cardData;
                if (!cd || !cd.instanceId) return false;
                return cd.instanceId === id && child.getData('isOpponentCard') && child.getData('isCardOnField');
            });
            if (obj) obj.destroy();
        });
        const existing = renderer.findCardObjectOnField(targetIndex);
        if (existing && existing.getData('isOpponentCard')) existing.destroy();
        const slotObj = this.scene['opponent_battle_slots'][targetIndex];
        const fusedObj = renderer.createFieldCard(slotObj, res.newCard, { isOpponent: true, revealed: true, fieldIndex: targetIndex });
        try { fusedObj.setTexture(`card-${res.newCard.type}-${res.newCard.level}`); } catch {}
        renderer.refreshOpponentHand(opponent.hand);
        renderer.updateDeckCounts(this.ctx.player.deck.getCardsCount(), opponent.deck.getCardsCount());
        // Una fusión cuenta como UNA acción del turno del bot.
        this.ctx.turn.consumeOpponentAction();
        this.continueTurn();
        return true;
    }

    /**
     * Ejecuta el ataque (calculado o aleatorio) decidido por el bot.
     * @param {object} plan Plan { kind: 'attack', attackerIndex, defenderIndex }.
     * @returns {boolean} true si el ataque se lanzó.
     */
    executeAttack(plan) {
        const { opponent, renderer, interaction, turnController, turn, debugSync } = this.ctx;
        const attackerObj = this.findOpponentCardObject(plan.attackerIndex);
        const defenderObj = this.findPlayerCardObject(plan.defenderIndex);
        if (!attackerObj || !defenderObj) return false;
        if (debugSync) console.log('[GameScene][debug] Oponente BOT atacando', { attackerIndex: plan.attackerIndex, defenderIndex: plan.defenderIndex, timestamp: Date.now() });
        renderer.revealOpponentCard(attackerObj);
        renderer.revealPlayerCard(defenderObj);
        const res = resolveCombat(attackerObj.getData('cardData'), defenderObj.getData('cardData'));
        interaction.registerCardAttack(attackerObj, 'opponent');
        this.scene.tweens.add({
            targets: attackerObj, x: defenderObj.x, y: defenderObj.y, duration: 200, yoyo: true, ease: 'Power1',
            onComplete: () => {
                if (res.loser === 'attacker') turnController.destroyCard(opponent, attackerObj.getData('fieldIndex'));
                else if (res.loser === 'defender') {
                    turnController.destroyCard(this.ctx.player, defenderObj.getData('fieldIndex'));
                    // Regla de esencias: el atacante (bot) gana el combate y llena la esencia de su tipo.
                    const winnerData = attackerObj.getData('cardData') || attackerObj.cardData;
                    if (winnerData && winnerData.type) {
                        opponent.fillEssence(winnerData.type);
                        this.scene.events.emit('essence-activated', opponent.id, winnerData.type);
                    }
                }
                turn.opponentPerformedAttackThisTurn = true;
                // El ataque consume una acción del turno del bot.
                turn.consumeOpponentAction();
                this.continueTurn();
            }
        });
        return true;
    }

    /**
     * Ejecuta el ataque directo (sin defensas) decidido por el bot.
     * @param {object} plan Plan { kind: 'directAttack', attackerIndex }.
     * @returns {boolean} true si el ataque directo se ejecutó.
     */
    executeDirectAttack(plan) {
        const { opponent, renderer, interaction, debugSync } = this.ctx;
        const attackerObj = this.findOpponentCardObject(plan.attackerIndex);
        if (!attackerObj) return false;
        if (debugSync) console.log('[GameScene][debug] Oponente BOT ataque directo', { attackerIndex: plan.attackerIndex, timestamp: Date.now() });
        renderer.revealOpponentCard(attackerObj);
        interaction.registerCardAttack(attackerObj, 'opponent');
        opponent.fillEssence(attackerObj.getData('cardData').type);
        this.scene.events.emit('essence-activated', opponent.id, attackerObj.getData('cardData').type);
        // El ataque directo consume una acción del turno del bot.
        this.ctx.turn.consumeOpponentAction();
        this.continueTurn();
        return true;
    }

    /**
     * Ejecuta la colocación de una carta desde la mano del oponente.
     * @param {object} plan Plan { kind: 'playCard', handIndex, slotIndex }.
     * @returns {boolean} true si la carta se colocó.
     */
    executePlayCard(plan) {
        const { opponent, renderer, debugSync } = this.ctx;
        const cardToPlay = opponent.hand[plan.handIndex];
        const slotIndex = plan.slotIndex;
        if (!cardToPlay || !opponent.field.isEmpty(slotIndex)) return false;
        if (debugSync) console.log('[GameScene][debug] Oponente BOT jugando carta', { cardInstanceId: cardToPlay.instanceId, slotIndex, timestamp: Date.now() });
        const played = opponent.playCardFromHand(cardToPlay.instanceId, slotIndex);
        if (!played) return false;
        const slotObj = this.scene['opponent_battle_slots'][slotIndex];
        renderer.createFieldCard(slotObj, played, { isOpponent: true, revealed: false, fieldIndex: slotIndex });
        opponent.drawCard();
        renderer.refreshOpponentHand(opponent.hand);
        renderer.updateDeckCounts(this.ctx.player.deck.getCardsCount(), opponent.deck.getCardsCount());
        // Colocar una carta consume una acción del turno del bot.
        this.ctx.turn.consumeOpponentAction();
        this.continueTurn();
        return true;
    }
}
