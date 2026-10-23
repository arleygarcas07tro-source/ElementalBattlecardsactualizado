/**
 * Controlador de presentación de ataques.
 *
 * Responsabilidad agregada: orquestar los ataques del jugador (a carta o
 * directo) y animar su secuencia (lanzamiento, impacto, retorno), aplicando el
 * resultado del combate resuelto por el dominio. Extraído de CardInteraction
 * para mantener archivos por debajo del límite de tamaño y una única
 * responsabilidad por clase.
 */
export default class AttackController {
    /**
     * @param {object} ctx Contexto compartido de la partida.
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.scene = ctx.scene;
    }

    /**
     * Gestiona el intento de ataque de una carta del jugador a una del oponente.
     * @param {object} attackingCardObject El objeto de la carta que ataca.
     * @param {object} defendingCardObject El objeto de la carta que defiende.
     */
    handleAttack(attackingCardObject, defendingCardObject) {
        const { turn, match, renderer } = this.ctx;
        // Bloquear si no es el turno, se agotó el cupo de acciones o hay una
        // animación bloqueante en curso.
        if (!this.ctx.turnController.canPlayerActNow()) {
            console.log('[GameScene] No puedes gastar una acción ahora mismo.');
            return;
        }

        // Restricción por nivel: comprobar blockedTurn en lugar de solo cooldown
        const blocked = attackingCardObject.getData('blockedTurn');
        if (blocked === turn.playerTurnNumber) {
            console.log('[GameScene] Esta carta está descansando este turno (restricción por nivel).');
            return;
        }

        // Unificamos el acceso a los datos de las cartas.
        const attackerData = attackingCardObject.getData('cardData');
        const defenderData = defendingCardObject.getData('cardData');

        console.log('[GameScene] Jugador realiza ataque', { attackerType: attackerData.type, defenderType: defenderData.type, attackerIndex: attackingCardObject.getData('fieldIndex'), defenderIndex: defendingCardObject.getData('fieldIndex') });

        // Revelamos ambos según regla 14
        renderer.revealPlayerCard(attackingCardObject);
        renderer.revealOpponentCard(defendingCardObject);

        // El motor resuelve el combate (incluye Ráfaga). Debe resolverse antes de
        // consumir la acción, porque consumirla agota Ráfaga.
        const outcome = match.resolvePlayerAttack({
            attackerIndex: attackingCardObject.getData('fieldIndex'),
            defenderIndex: defendingCardObject.getData('fieldIndex')
        });
        if (!outcome) return;
        const result = outcome.result;

        // Consumimos la acción del jugador y agotamos Ráfaga.
        match.markPlayerAttackConsumed();
        console.log('[GameScene] Resultado del combate', result);

        // Registrar cooldowns / consecutiveAttacks
        this.ctx.interaction.registerCardAttack(attackingCardObject, 'player');

        // Emitir evento de ataque si estamos en LAN
        if (this.ctx.isLAN && this.ctx.socket) {
            this.ctx.lan.emitGameEvent({
                type: 'attack',
                attackerIndex: attackingCardObject.getData('fieldIndex'),
                defenderIndex: defendingCardObject.getData('fieldIndex'),
                result: result
            });
        }

        this.animateAttack(attackingCardObject, defendingCardObject, result);
    }

    /**
     * Gestiona un ataque directo al oponente cuando no tiene cartas en el campo.
     * @param {object} attackingCardObject La carta que ataca.
     */
    handleDirectAttack(attackingCardObject) {
        const { turn, match, renderer } = this.ctx;
        // Bloquear si no es el turno, se agotó el cupo de acciones o hay una
        // animación bloqueante en curso.
        if (!this.ctx.turnController.canPlayerActNow()) {
            console.log('[GameScene] No puedes gastar una acción ahora mismo.');
            return;
        }

        const blocked = attackingCardObject.getData('blockedTurn');
        if (blocked === turn.playerTurnNumber) {
            console.log('[GameScene] Esta carta está descansando este turno (restricción por nivel).');
            return;
        }

        const attackerData = attackingCardObject.cardData || attackingCardObject.getData('cardData');
        // Un ataque directo siempre gana: no aplica la Ráfaga, pero la consume.
        match.markPlayerAttackConsumed();

        console.log('[GameScene] Jugador realiza ataque directo', { attackerType: attackerData.type, attackerIndex: attackingCardObject.getData('fieldIndex') });

        // Llenamos la esencia del jugador y notificamos a la UI de la escena.
        this.ctx.player.fillEssence(attackerData.type);
        this.scene.events.emit('essence-activated', this.ctx.player.id, attackerData.type);

        // Marcar la carta como revelada (ataca)
        renderer.revealPlayerCard(attackingCardObject);

        // Registrar cooldown / consecutive attacks
        this.ctx.interaction.registerCardAttack(attackingCardObject, 'player');

        // Emitir evento de ataque directo si estamos en LAN
        if (this.ctx.isLAN && this.ctx.socket) {
            this.ctx.lan.emitGameEvent({
                type: 'direct_attack',
                attackerIndex: attackingCardObject.getData('fieldIndex'),
                essenceType: attackerData.type
            });
        }

        // Animamos el ataque (hacia el centro)
        const targetPos = { x: this.scene.scale.width / 2, y: this.scene['opponent_battle_slots'][0].y };
        this.animateAttack(attackingCardObject, targetPos, { winner: 'attacker', loser: 'none' });
    }

    /**
     * Anima la secuencia de ataque (lanzamiento, impacto, retorno) y aplica el
     * resultado del combate, finalizando el turno del jugador.
     * @param {object} attackingCardObject
     * @param {object} target Objeto carta o posición objetivo.
     * @param {object} result Resultado del combate { winner, loser }.
     */
    animateAttack(attackingCardObject, target, result) {
        const { turn, renderer, turnController } = this.ctx;
        turn.onBlockingAnimationStarted();
        console.log('[GameScene] Animación de ataque iniciada. Bloqueos activos:', turn.blockingAnimations);

        // Evitar el "lift" de selección en curso.
        this.scene.tweens.killTweensOf(attackingCardObject);

        const targetX = target.x;
        const targetY = target.y;
        const startX = attackingCardObject.x;
        const startY = attackingCardObject.y;
        const baseScale = attackingCardObject.scale;
        const defenderCard = (target && typeof target.getData === 'function') ? target : null;

        // Fase 1 — lanzamiento: el atacante se estira y vuela al objetivo.
        this.scene.tweens.add({
            targets: attackingCardObject,
            x: targetX,
            y: targetY,
            scaleX: baseScale * 1.18,
            scaleY: baseScale * 0.9,
            duration: 180,
            ease: 'Sine.easeIn',
            onComplete: () => {
                // Fase 2 — impacto: shake de cámara, destello, ondas y retroceso del defensor.
                const defenderData = defenderCard ? ((defenderCard.getData && defenderCard.getData('cardData')) || defenderCard.cardData) : null;
                const impactColor = defenderData ? renderer.typeColor(defenderData.type) : 0xffffff;
                this.scene.cameras.main.shake(70, 0.004);
                renderer.playImpact(targetX, targetY, impactColor);

                if (defenderCard && defenderCard.active) {
                    const defenderIsOpponent = !!defenderCard.getData('isOpponentCard');
                    const direction = defenderIsOpponent ? -1 : 1;
                    this.scene.tweens.add({
                        targets: defenderCard,
                        y: defenderCard.y + direction * 26,
                        duration: 130,
                        yoyo: true,
                        ease: 'Sine.easeOut'
                    });
                }

                // Fase 3 — retorno del atacante a su posición y escala.
                // El final del ataque debe ejecutarse SOLO una vez y SIEMPRE:
                // si el atacante se destruye a mitad de secuencia, Phaser cancela
                // el onComplete y el bloqueo quedaría atascado (pantalla congelada).
                let attackDone = false;
                const finalizeAttack = () => {
                    if (attackDone) return;
                    attackDone = true;
                    this.ctx.interaction.deselectCard(false);
                    const attackerIdx = attackingCardObject.active ? attackingCardObject.getData('fieldIndex') : null;
                    console.log('[GameScene] animateAttack local complete, result:', result, { attackerFieldIndex: attackerIdx, target });
                    // Determinar owner del atacante según metadata visual
                    const attackerIsOpponent = !!attackingCardObject.getData('isOpponentCard');
                    const attackerOwner = attackerIsOpponent ? this.ctx.opponent : this.ctx.player;
                    // Si el target es un objeto visual de carta, determinar su owner
                    let defenderOwner = null;
                    let defenderFieldIndex = null;
                    if (defenderCard && defenderCard.active) {
                        const defenderIsOpponent = !!defenderCard.getData('isOpponentCard');
                        defenderOwner = defenderIsOpponent ? this.ctx.opponent : this.ctx.player;
                        defenderFieldIndex = defenderCard.getData('fieldIndex');
                    }

                    if (result.loser === 'attacker') {
                        console.log('[GameScene] animateAttack: destruyendo atacante', { owner: attackerOwner.id, idx: attackerIdx });
                        if (attackerIdx !== null) turnController.destroyCard(attackerOwner, attackerIdx);
                    } else if (result.loser === 'defender' && defenderOwner && typeof defenderFieldIndex === 'number') {
                        console.log('[GameScene] animateAttack: destruyendo defensor', { owner: defenderOwner.id, idx: defenderFieldIndex });
                        turnController.destroyCard(defenderOwner, defenderFieldIndex);
                        // Regla de esencias: el atacante gana el combate y llena la esencia de su tipo.
                        const winnerData = attackingCardObject.getData('cardData') || attackingCardObject.cardData;
                        if (winnerData && winnerData.type) {
                            attackerOwner.fillEssence(winnerData.type);
                            this.scene.events.emit('essence-activated', attackerOwner.id, winnerData.type);
                        }
                    }

                    // Tras el ataque se consume una acción: si ya no queda cupo,
                    // el turno termina; si queda, el jugador puede seguir jugando.
                    turnController.afterPlayerAction();
                    turnController.animationComplete();
                };

                this.scene.tweens.add({
                    targets: attackingCardObject,
                    x: startX,
                    y: startY,
                    scaleX: baseScale,
                    scaleY: baseScale,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: finalizeAttack
                });

                // Red de seguridad por si el atacante muere durante la secuencia.
                this.scene.time.delayedCall(1000, finalizeAttack);
            }
        });
    }
}
