/**
 * Aplicador de efectos remotos LAN.
 *
 * Responsabilidad agregada: traducir los "efectos" descriptivos que produce
 * LANEventRouter (tras actualizar el modelo de dominio) en operaciones de
 * presentación (crear/destruir cartas, revelar y animar). Es el único punto
 * donde los eventos remotos tocan el tablero.
 */
export default class RemoteEffectApplier {
    /**
     * @param {object} ctx Contexto compartido de la partida.
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.scene = ctx.scene;
    }

    /**
     * Maneja un evento remoto delegando el dominio en LANEventRouter y aplicando
     * los efectos visuales devueltos.
     * @param {object} payload
     */
    handle(payload) {
        const routed = this.ctx.lanRouter.route(payload);
        if (!routed) return;
        routed.effects.forEach((effect) => this.applyEffect(effect));
    }

    /**
     * Ejecuta un efecto visual descriptivo devuelto por LANEventRouter.
     * @param {object} effect
     */
    applyEffect(effect) {
        const { renderer, turnController, opponent, turn, debugSync } = this.ctx;
        const targetSlotsName = effect.isRemotePlayer ? 'opponent_battle_slots' : 'player_battle_slots';

        switch (effect.kind) {
            case 'play-card': {
                const slot = this.scene[targetSlotsName] && this.scene[targetSlotsName][effect.fieldIndex];
                if (!slot) break;
                const card = effect.card;
                const oppCard = renderer.createFieldCard(slot, card, { isOpponent: effect.isRemotePlayer, revealed: false, fieldIndex: effect.fieldIndex });
                console.log('[GameScene] Carta colocada por remoto', { actor: effect.actor || (effect.isRemotePlayer ? 'opponent' : 'player'), playerRole: effect.playerRole || null, cardId: card.id, instanceId: card.instanceId, type: card.type, level: card.level, fieldIndex: effect.fieldIndex });
                if (debugSync) console.log('[GameScene][debug] slot visual after remote play', { created: oppCard && oppCard.getData && oppCard.getData('instanceId'), slotIndex: effect.fieldIndex, timestamp: Date.now() });
                break;
            }

            case 'fuse-cards': {
                const { sourceIndex, targetIndex, resultCard } = effect;

                const cardObjs = this.scene.children.list.filter(c =>
                    c.getData('isOpponentCard') &&
                    c.getData('isCardOnField') &&
                    (c.getData('fieldIndex') === sourceIndex || c.getData('fieldIndex') === targetIndex)
                );
                cardObjs.forEach(obj => obj.destroy());

                const slot = this.scene[targetSlotsName][targetIndex];
                if (slot) {
                    const fusedObj = renderer.createFieldCard(slot, resultCard, { isOpponent: true, revealed: true, fieldIndex: targetIndex });
                    try { fusedObj.setTexture(`card-${resultCard.type}-${resultCard.level}`); } catch {}
                    console.log('[GameScene] Fusión remota en campo', { sourceIndex, targetIndex, resultCard });
                    if (debugSync) console.log('[GameScene][debug] slot visual after remote fuse_cards', { created: fusedObj && fusedObj.getData && fusedObj.getData('instanceId'), slotIndex: targetIndex, timestamp: Date.now() });
                }
                break;
            }

            case 'fuse-from-hand': {
                const { targetIndex, resultCard } = effect;

                const oldCard = this.scene.children.list.find(c =>
                    c.getData('isOpponentCard') &&
                    c.getData('isCardOnField') &&
                    c.getData('fieldIndex') === targetIndex
                );
                if (oldCard) oldCard.destroy();

                const slot = this.scene[targetSlotsName][targetIndex];
                if (slot) {
                    const fusedObj = renderer.createFieldCard(slot, resultCard, { isOpponent: true, revealed: true, fieldIndex: targetIndex });
                    try { fusedObj.setTexture(`card-${resultCard.type}-${resultCard.level}`); } catch {}
                    console.log('[GameScene] Fusión remota desde mano', { targetIndex, resultCard });
                    if (debugSync) console.log('[GameScene][debug] slot visual after remote fuse_from_hand', { created: fusedObj && fusedObj.getData && fusedObj.getData('instanceId'), slotIndex: targetIndex, timestamp: Date.now() });
                }

                renderer.refreshOpponentHand(opponent.hand);
                break;
            }

            case 'attack': {
                const { attackerIndex, defenderIndex, result } = effect;

                if (debugSync) console.log('[GameScene][debug] handling remote attack', { attackerIndex, defenderIndex, result, timestamp: Date.now() });
                const attackerObj = this.scene.children.list.find(c =>
                    c.getData('isOpponentCard') &&
                    c.getData('isCardOnField') &&
                    c.getData('fieldIndex') === attackerIndex
                );
                const defenderObj = this.scene.children.list.find(c =>
                    !c.getData('isOpponentCard') &&
                    c.getData('isCardOnField') &&
                    c.getData('fieldIndex') === defenderIndex
                );

                if (!attackerObj || !defenderObj) {
                    console.warn('No se encontraron las cartas para el ataque remoto', { attackerIndex, defenderIndex });
                    break;
                }

                renderer.revealOpponentCard(attackerObj);
                renderer.revealPlayerCard(defenderObj);
                console.log('[GameScene] Ataque remoto - animando', { attackerIndex, defenderIndex, result });

                this.scene.tweens.add({
                    targets: attackerObj,
                    x: defenderObj.x,
                    y: defenderObj.y,
                    duration: 200,
                    yoyo: true,
                    ease: 'Power1',
                    onComplete: () => {
                        console.log('[GameScene] Ataque remoto complete, aplicando resultado:', result);
                        if (result.loser === 'attacker') {
                            const ownerIsOpponent = !!attackerObj.getData('isOpponentCard');
                            const owner = ownerIsOpponent ? opponent : this.ctx.player;
                            const idx = attackerObj.getData('fieldIndex');
                            console.log('[GameScene] Resultado indica atacante perdió; destruyendo objeto encontrado', { owner: owner.id, idx, ownerIsOpponent });
                            turnController.destroyCard(owner, idx);
                        } else if (result.loser === 'defender') {
                            const ownerIsOpponent = !!defenderObj.getData('isOpponentCard');
                            const owner = ownerIsOpponent ? opponent : this.ctx.player;
                            const idx = defenderObj.getData('fieldIndex');
                            console.log('[GameScene] Resultado indica defensor perdió; destruyendo objeto encontrado', { owner: owner.id, idx, ownerIsOpponent });
                            turnController.destroyCard(owner, idx);
                            const winnerData = attackerObj.getData('cardData') || attackerObj.cardData;
                            if (winnerData && winnerData.type) {
                                opponent.fillEssence(winnerData.type);
                                this.scene.events.emit('essence-activated', opponent.id, winnerData.type);
                            }
                        }
                    }
                });
                break;
            }

            case 'direct-attack': {
                const attackerObj = this.scene.children.list.find(c =>
                    c.getData('isOpponentCard') &&
                    c.getData('isCardOnField') &&
                    c.getData('fieldIndex') === effect.attackerIndex
                );

                if (!attackerObj) break;

                renderer.revealOpponentCard(attackerObj);
                opponent.fillEssence(effect.essenceType);
                this.scene.events.emit('essence-activated', opponent.id, effect.essenceType);

                const targetPos = { x: this.scene.scale.width / 2, y: this.scene['player_battle_slots'][0].y };
                this.scene.tweens.add({
                    targets: attackerObj,
                    x: targetPos.x,
                    y: targetPos.y,
                    duration: 200,
                    yoyo: true,
                    ease: 'Power1',
                    onComplete: () => {
                        if (effect.isOpponentAction) {
                            // El ataque remoto consume una acción del turno del rival.
                            turn.consumeOpponentAction();
                            turn.opponentPerformedAttackThisTurn = true;
                        }
                    }
                });
                break;
            }

            default:
                console.log('Efecto remoto no manejado:', effect.kind);
        }
    }
}
