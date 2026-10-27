import { play as playSfx } from '../helpers/audioManager.js';
import {
    recordFusion,
    recordAttackWithType,
    recordCollectedCard
} from '../helpers/playerProgress.js';
import LevelAttackRule from '../game/LevelAttackRule.js';

/**
 * Interacción de cartas del jugador.
 *
 * Responsabilidad agregada: resolver los clics/selección de cartas y orquestar
 * las acciones del jugador (jugar, fusionar, atacar) coordinando el modelo de
 * dominio (ctx.match / players) con las animaciones del tablero. No decide
 * reglas: valida con el dominio y delega el dibujado en BoardRenderer y el
 * flujo de turno en TurnController.
 */
export default class CardInteraction {
    /**
     * @param {object} ctx Contexto compartido de la partida.
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.scene = ctx.scene;
        this.selectedCard = null; // Carta seleccionada actualmente.
    }

    /**
     * Gestiona toda la lógica cuando se hace clic en una carta.
     * @param {object} clickedCard El objeto de la carta que ha sido clicada.
     */
    onCardClicked(clickedCard) {
        // Evitar seleccionar cartas del oponente directamente.
        const clickedIsOpponent = !!clickedCard.getData('isOpponentCard');

        // Si se clicó una carta del oponente:
        if (clickedIsOpponent) {
            // Permitir solo que sea objetivo de un ataque si ya hay una carta propia
            // seleccionada en el campo.
            if (this.selectedCard && this.selectedCard.getData('isCardOnField') && !this.selectedCard.getData('isOpponentCard') && clickedCard.getData('isCardOnField')) {
                this.ctx.attackController.handleAttack(this.selectedCard, clickedCard);
            } else {
                // Ignorar clicks que intenten seleccionar una carta enemiga.
                return;
            }
            return;
        }

        // A partir de aquí, la carta clicada no es del oponente.
        // Si no hay ninguna carta seleccionada...
        if (!this.selectedCard) {
            this.selectCard(clickedCard);
            return;
        }

        // Si hacemos clic en la carta que ya estaba seleccionada...
        if (this.selectedCard === clickedCard) {
            this.deselectCard();
            return;
        }

        // FUSIÓN: ambas en campo y propias -> válido
        if (this.selectedCard.getData('isCardOnField') && clickedCard.getData('isCardOnField') && !clickedCard.getData('isOpponentCard')) {
            this.attemptToFuse(this.selectedCard, clickedCard);
            return;
        }

        // Si la carta seleccionada está en la mano y el usuario clicó una carta en el campo:
        // NO permitir fusión desde la mano --> cambiamos selección: seleccionamos la carta del campo.
        if (!this.selectedCard.getData('isCardOnField') && clickedCard.getData('isCardOnField')) {
            this.deselectCard(true);
            this.selectCard(clickedCard);
            return;
        }

        // Si no es acción válida, solo cambiamos la selección
        this.deselectCard(true);
        this.selectCard(clickedCard);
    }

    /**
     * Gestiona el clic en un slot del campo de batalla.
     * @param {object} clickedSlot El slot que ha sido clicado.
     */
    onSlotClicked(clickedSlot) {
        // Solo hacemos algo si hay una carta seleccionada y no es una carta del campo
        if (this.selectedCard && !this.selectedCard.getData('isCardOnField')) {
            this.handlePlayCard(this.selectedCard, clickedSlot);
        } // Si no hay carta seleccionada, o la carta ya está en el campo, el clic en el tablero se encargará de deseleccionar.
        // Si hay una carta seleccionada y el oponente no tiene cartas, es un ataque directo.
        else if (this.selectedCard && this.selectedCard.getData('isCardOnField')) {
            const opponentFieldCards = this.ctx.opponent.field.cards();
            if (opponentFieldCards.length === 0) {
                this.ctx.attackController.handleDirectAttack(this.selectedCard);
            }
        }
    }

    /**
     * Gestiona el clic en un slot del campo de batalla del oponente.
     * @param {object} clickedSlot El slot que ha sido clicado.
     */
    onOpponentSlotClicked(_clickedSlot) {
        // Si tenemos una carta de nuestro campo seleccionada...
        if (this.selectedCard && this.selectedCard.getData('isCardOnField')) {
            // Y el oponente no tiene cartas en el campo...
            const opponentHasCards = this.ctx.opponent.field.hasAny();
            if (!opponentHasCards) {
                this.ctx.attackController.handleDirectAttack(this.selectedCard);
            }
        }
    }

    /**
     * Marca una carta como seleccionada y ejecuta una animación.
     * @param {object} cardObject La carta a seleccionar.
     */
    selectCard(cardObject) {
        this.selectedCard = cardObject;
        const fieldIndex = cardObject.getData('fieldIndex');
        console.log('Carta seleccionada:', { ...cardObject.cardData, fieldIndex: fieldIndex !== undefined ? fieldIndex : null });

        this.scene.tweens.killTweensOf(cardObject);
        cardObject.setSelectedVisual?.(true);
        const isOnField = !!cardObject.getData('isCardOnField');
        const yShift = isOnField ? -25 : -50; // Se levanta más si está en la mano
        this.scene.tweens.add({
            targets: cardObject,
            y: cardObject.getData('startPosition').y + yShift,
            duration: 90,
            ease: 'Power1'
        });
    }

    /**
     * Deselecciona la carta activa y la devuelve a su posición original.
     * @param {boolean} [animate=true] - Si la animación de retorno debe ejecutarse.
     */
    deselectCard(animate = true) {
        if (!this.selectedCard) return;

        const cardToDeselect = this.selectedCard; // Guardamos la referencia
        this.selectedCard = null;
        console.log('Carta deseleccionada.');
        cardToDeselect.setSelectedVisual?.(false);

        const startPosition = cardToDeselect.getData('startPosition');
        if (!startPosition) return;
        this.scene.tweens.killTweensOf(cardToDeselect);
        if (animate) {
            this.scene.tweens.add({
                targets: cardToDeselect,
                x: startPosition.x,
                y: startPosition.y,
                duration: 100,
                ease: 'Power1'
            });
        } else {
            cardToDeselect.setPosition(startPosition.x, startPosition.y);
        }
    }

    /**
     * Gestiona la lógica cuando un jugador intenta jugar una carta de la mano a un slot.
     * @param {object} cardObject El objeto de la carta jugada.
     * @param {object} dropZone El slot del campo de batalla.
     */
    handlePlayCard(cardObject, dropZone) {
        const { turn, player, renderer, playerData, debugSync } = this.ctx;
        if (!cardObject || !dropZone || cardObject.getData('isCardOnField')) return;
        // Bloquear jugadas si no es el turno del jugador, ya gastó su cupo de
        // acciones o hay una animación bloqueante en curso.
        if (!this.ctx.turnController.canPlayerActNow()) {
            const message = turn.state !== 'player-turn'
                ? 'Espera tu turno para colocar una carta.'
                : 'No tienes acciones disponibles ahora. Espera a que termine la acción actual.';
            this.scene.events.emit('gameplay-message', message);
            console.log('[GameScene] No puedes gastar una acción ahora mismo.');
            return;
        }
        if (turn.playerMustAttackThisTurn) {
            this.scene.events.emit('gameplay-message', 'Estás obligado a atacar antes de colocar o fusionar cartas.');
            console.log('[GameScene] Estás obligado a atacar este turno. No puedes colocar cartas.');
            return;
        }

        // Obtenemos los datos de la carta seleccionada y el índice del slot.
        const cardDataFromHand = cardObject.getData('cardData') || cardObject.cardData;
        const fieldIndex = dropZone.getData('fieldIndex');
        if (!cardDataFromHand || !Number.isInteger(fieldIndex)) return;
        const targetCardData = player.field.get(fieldIndex);

        console.log('[GameScene] Intento de jugar carta en slot', { slotIndex: fieldIndex, cardFromHand: cardDataFromHand && { id: cardDataFromHand.id, instanceId: cardDataFromHand.instanceId, type: cardDataFromHand.type, level: cardDataFromHand.level } });
        if (debugSync) {
            console.log('[GameScene][debug] pre-play state:', {
                playerField: player.field.snapshot().map(f => f && f.instanceId),
                playerHand: player.hand.map(h => h && h.instanceId),
                targetSlotIndex: fieldIndex,
                timestamp: Date.now()
            });
        }

        // Escenario 1: El slot está vacío. Jugamos la carta normalmente.
        if (targetCardData === null) {
            const cardPlayed = player.playCardFromHand(cardDataFromHand.instanceId, fieldIndex);
            if (debugSync) console.log('[GameScene][debug] playCardFromHand result', { cardPlayed: cardPlayed && cardPlayed.instanceId, fieldIndex, timestamp: Date.now() });
            if (!cardPlayed) {
                console.log('El slot ya estaba ocupado (verificación secundaria). La carta volverá a la mano.');
                return; // No hacemos nada más, dragend la devolverá.
            }

            const playedCardObject = cardObject;
            playedCardObject.cardData = cardPlayed;
            playedCardObject.setData('cardData', cardPlayed);
            playedCardObject.setData('instanceId', cardPlayed.instanceId);
            playedCardObject.setName(cardPlayed.instanceId);
            playedCardObject.setData('isCardOnField', true);
            playedCardObject.setData('fieldIndex', fieldIndex);
            playedCardObject.setData('isRevealed', false);
            playedCardObject.setData('startPosition', { x: dropZone.x, y: dropZone.y });
            playedCardObject.setSelectedVisual?.(false, false);
            if (playedCardObject.input) playedCardObject.input.enabled = false;
            this.scene.tweens.killTweensOf(playedCardObject);
            this.selectedCard = null;
            this.scene['player-cards'] = this.scene['player-cards'].filter(card => card !== playedCardObject);
            playedCardObject.setDisplaySize(renderer.cardFieldSize.width, renderer.cardFieldSize.height);

            this.ctx.match.consumePlayerAction();
            turn.onBlockingAnimationStarted();
            let playFinished = false;
            const finishPlay = () => {
                if (playFinished) return;
                playFinished = true;
                if (playedCardObject.active && playedCardObject.input) {
                    playedCardObject.input.enabled = true;
                    playedCardObject.input.cursor = 'pointer';
                }

                player.drawCard();
                playSfx('card', this.scene);
                playSfx('draw', this.scene);
                renderer.refreshPlayerHand(player.hand);
                renderer.updateDeckCounts(player.deck.getCardsCount(), this.ctx.opponent.deck.getCardsCount());

                console.log('[GameScene] Jugador colocó carta en el campo', { cardId: cardPlayed.id, instanceId: cardPlayed.instanceId, type: cardPlayed.type, level: cardPlayed.level, fieldIndex });
                recordCollectedCard((playerData && playerData.username) || 'Jugador', cardPlayed.type, cardPlayed.level);
                if (this.ctx.isLAN && this.ctx.socket) {
                    if (debugSync) console.log('[GameScene][debug] emitiendo play_card payload', { payload: { type: 'play_card', card: cardPlayed, fieldIndex }, timestamp: Date.now() });
                    this.ctx.lan.emitGameEvent({ type: 'play_card', card: cardPlayed, fieldIndex });
                }

                this.ctx.turnController.afterPlayerAction();
                this.ctx.turnController.animationComplete();
            };

            this.scene.tweens.add({
                targets: playedCardObject,
                x: dropZone.x,
                y: dropZone.y,
                duration: 100,
                ease: 'Power1',
                onComplete: finishPlay
            });

        // Escenario 2: El slot está OCUPADO.
        } else {
            this.scene.events.emit('gameplay-message', 'Ese espacio del campo ya está ocupado.');
            console.log(`Slot ${fieldIndex} ocupado. No se puede jugar la carta aquí. La carta volverá a la mano.`);
            // No hacemos nada. La bandera 'dropped' sigue en false y el evento 'dragend' la devolverá.
        }
    }

    /**
     * Intenta fusionar dos cartas en el campo de batalla.
     * @param {object} selectedCardObject La carta que el jugador seleccionó.
     * @param {object} targetCardObject La carta sobre la que se soltó la primera.
     */
    attemptToFuse(selectedCardObject, targetCardObject) {
        const { turn, player, renderer, turnController, playerData, isLAN, socket } = this.ctx;
        // Bloquear fusiones si no es turno, se agotó el cupo de acciones o hay
        // una animación bloqueante en curso.
        if (!turnController.canPlayerActNow()) {
            console.log('[GameScene] No puedes gastar una acción ahora mismo.');
            return;
        }
        if (turn.playerMustAttackThisTurn) {
            console.log('[GameScene] Estás obligado a atacar este turno. No puedes fusionar.');
            return;
        }

        // 1. Obtenemos los datos de las cartas involucradas.
        const initiatingFusionCardData = selectedCardObject.cardData;
        const targetCardData = targetCardObject.cardData;
        const targetIndex = targetCardObject.getData('fieldIndex');
        const fusionPosition = { x: targetCardObject.x, y: targetCardObject.y };

        // 2. Validación: AMBAS cartas deben estar en el campo (solo campo⇄campo).
        if (!selectedCardObject.getData('isCardOnField') || !targetCardObject.getData('isCardOnField')) {
            console.log('%cFusión inválida: ambas cartas deben estar en el campo.', 'color: #ff4444');
            this.deselectCard(false);
            return;
        }

        console.log('[GameScene] Intento de fusión entre cartas del campo', { sourceId: initiatingFusionCardData.id, targetId: targetCardData.id, sourceType: initiatingFusionCardData.type, targetType: targetCardData.type });

        // --- Validaciones ---
        const areSameType = initiatingFusionCardData.type === targetCardData.type;
        const areSameLevel = initiatingFusionCardData.level === targetCardData.level;
        console.log(initiatingFusionCardData.type, targetCardData.type, initiatingFusionCardData.level, targetCardData.level);

        if (!areSameType || !areSameLevel) {
            console.log('Fallo de fusión: Las cartas no son compatibles.');
            this.deselectCard(); // Deseleccionamos la carta activa
            return;
        }

        // --- Ejecutar Fusión ---
        // 3. Asegurar sincronía entre la vista y el modelo antes de actualizar datos.
        const selIdx = selectedCardObject.getData('fieldIndex');
        const tgtIdx = targetIndex;

        const ensureModelAt = (idx, cardObj) => {
            if (typeof idx !== 'number') return;
            if (!player.field.get(idx)) {
                const cd = (cardObj.getData && cardObj.getData('cardData')) || cardObj.cardData;
                if (cd) {
                    console.warn('[GameScene] Sincronizando modelo: rellenando player.field slot [' + idx + '] desde objeto visual', cd);
                    player.field.set(idx, cd);
                }
            } else {
                // Si existe modelo pero difiere de la vista, informar
                const modelCd = player.field.get(idx);
                const viewCd = (cardObj.getData && cardObj.getData('cardData')) || cardObj.cardData;
                if (viewCd && modelCd.instanceId && viewCd.instanceId && modelCd.instanceId !== viewCd.instanceId) {
                    console.warn('[GameScene] Desincronización detectada en slot', idx, 'modelo.instanceId=', modelCd.instanceId, 'vista.instanceId=', viewCd.instanceId);
                }
            }
        };

        ensureModelAt(selIdx, selectedCardObject);
        ensureModelAt(tgtIdx, targetCardObject);

        // 3. Actualizar el modelo de datos.
        const fusionResult = player.fuseCards(selIdx, tgtIdx);
        console.log('[GameScene] Fusión de campo procesada', { sourceIndex: selIdx, targetIndex: tgtIdx, result: fusionResult });
        if (!fusionResult) {
            console.error("Error en el modelo de datos al fusionar.");
            this.deselectCard();
            return;
        }

        // Para "reiniciar" el slot de destino, lo desactivamos temporalmente.
        // La nueva carta fusionada, al ser una dropzone, se encargará de capturar
        // los eventos de 'drop' en esa posición.
        const targetSlot = this.scene['player_battle_slots'][targetIndex];
        if (targetSlot) targetSlot.disableInteractive();

        const fusedCardData = fusionResult.newCard;
        // Reactivamos el slot que el modelo nos dice que se ha vaciado.
        const originalSlot = this.scene['player_battle_slots'][fusionResult.emptiedIndex];
        if (originalSlot) originalSlot.setInteractive({ dropZone: true });


        // 4. Consumir la acción: una fusión cuenta como UNA acción completa,
        //    aunque combine varias cartas.
        this.ctx.match.consumePlayerAction();

        // Emitir evento de fusión si estamos en LAN
        if (isLAN && socket) {
            this.ctx.lan.emitGameEvent({
                type: 'fuse_cards',
                sourceIndex: selIdx,
                targetIndex: tgtIdx,
                resultCard: fusedCardData
            });
        }

        this.deselectCard(false); // Deseleccionamos sin animar.

        // 5. Animar la fusión: la fuente converge sobre el objetivo, ambas
        //    emiten destello + partículas del tipo antes de desaparecer.
        this.scene.tweens.killTweensOf(selectedCardObject); // Evita el "lift" de selección en curso.
        turn.onBlockingAnimationStarted();
        renderer.playFusion({ sourceCard: selectedCardObject, targetCard: targetCardObject, type: fusedCardData.type }, () => {
            // 6. Crear la carta resultante sin alterar su tamaño: fade-in + fuegos artificiales.
            const fusedCardObject = renderer.createFieldCardAt(fusionPosition.x, fusionPosition.y, fusedCardData, { isOpponent: false, revealed: true, fieldIndex: targetIndex });
            fusedCardObject.setAlpha(0);
            renderer.playFireworks(fusionPosition.x, fusionPosition.y, fusedCardData.type);

            // El fin de la fusión se garantiza con un timer: si la carta resultante
            // se destruye antes de completar el fade-in, Phaser cancelaría el
            // onComplete y el juego se quedaría congelado.
            let fusionDone = false;
            const finishFusion = () => {
                if (fusionDone) return;
                fusionDone = true;
                console.log('[GameScene] Carta fusionada creada en campo', { fieldIndex: targetIndex, fusedCard: fusedCardData });
                // Progreso: la fusión cuenta y la carta resultante entra en la colección.
                recordFusion((playerData && playerData.username) || 'Jugador');
                recordCollectedCard((playerData && playerData.username) || 'Jugador', fusedCardData.type, fusedCardData.level);
                turnController.animationComplete();
                turnController.afterPlayerAction();
            };

            this.scene.tweens.add({
                targets: fusedCardObject,
                alpha: { from: 0, to: 1 },
                duration: 200,
                ease: 'Power2',
                onComplete: finishFusion
            });

            // Margen de seguridad por si el tween no completa.
            this.scene.time.delayedCall(600, finishFusion);
        });
    }

    /**
     * Intenta fusionar una carta de la mano con una carta en el campo.
     * @param {object} handCardObject La carta seleccionada de la mano.
     * @param {object} fieldCardObject La carta objetivo en el campo.
     */
    attemptToFuseFromHand(handCardObject, fieldCardObject) {
        const { turn, player, renderer, turnController, playerData, isLAN, socket } = this.ctx;
        // Bloquear si se agotó el cupo de acciones, no es el turno o hay una
        // animación bloqueante en curso.
        if (!turnController.canPlayerActNow()) {
            console.log('[GameScene] No puedes gastar una acción ahora mismo.');
            return;
        }
        if (turn.playerMustAttackThisTurn) {
            console.log('[GameScene] Estás obligado a atacar este turno. No puedes fusionar.');
            return;
        }

        const handCardData = handCardObject.cardData;
        const fieldCardData = fieldCardObject.cardData;
        const targetIndex = fieldCardObject.getData('fieldIndex');

        console.log('[GameScene] Intento de fusión desde la mano', { handCardId: handCardData.id, fieldCardId: fieldCardData.id, targetIndex });

        // 1. Llamamos al modelo del jugador para que gestione la fusión.
        const fusionResult = player.fuseFromHand(handCardData.instanceId, targetIndex);

        // 2. Si el modelo devuelve null, la fusión no era válida (tipos/niveles no coinciden).
        if (!fusionResult) {
            console.log('[GameScene] Fallo de fusión desde la mano: cartas no compatibles', { handCardId: handCardData.id, targetIndex });
            this.deselectCard(); // Deseleccionamos la carta de la mano.
            return;
        }

        console.log('[GameScene] Fusión desde la mano realizada', { handCardId: handCardData.instanceId, targetIndex, result: fusionResult });

        // 3. Posición donde quedará la carta resultante (slot del campo).
        const fusionPosition = { x: fieldCardObject.x, y: fieldCardObject.y };

        // 4. Deseleccionamos y consumimos la acción.
        this.deselectCard(false); // Deseleccionamos sin animación.

        // Consumir acción y emitir evento de fusión desde mano si estamos en LAN
        this.ctx.match.consumePlayerAction();
        if (isLAN && socket) {
            this.ctx.lan.emitGameEvent({
                type: 'fuse_from_hand',
                handCardId: handCardData.instanceId,
                targetIndex: targetIndex,
                resultCard: fusionResult
            });
        }

        // 5. Animar la fusión: la carta de la mano converge sobre la del campo.
        this.scene.tweens.killTweensOf(handCardObject); // Evita el "lift" de selección en curso.
        turn.onBlockingAnimationStarted();
        renderer.playFusion({ sourceCard: handCardObject, targetCard: fieldCardObject, type: fusionResult.type }, () => {
            // 6. Reponer la carta usada desde la mano (tras destruirse el origen en el efecto).
            player.drawCard();
            renderer.refreshPlayerHand(player.hand);
            renderer.updateDeckCounts(player.deck.getCardsCount(), this.ctx.opponent.deck.getCardsCount());

            // 7. Crear la carta resultante sin alterar su tamaño: fade-in + fuegos artificiales.
            console.log('[GameScene] Carta fusionada (mano->campo) creada', { fieldIndex: targetIndex, fusedCard: fusionResult });
            const fusedCardObject = renderer.createFieldCardAt(fusionPosition.x, fusionPosition.y, fusionResult, { isOpponent: false, revealed: true, fieldIndex: targetIndex });
            fusedCardObject.setAlpha(0);
            renderer.playFireworks(fusionPosition.x, fusionPosition.y, fusionResult.type);

            // El fin de la fusión se garantiza con un timer: si la carta resultante
            // se destruye antes de completar el fade-in, Phaser cancelaría el
            // onComplete y el juego se quedaría congelado.
            let fusionDone = false;
            const finishFusion = () => {
                if (fusionDone) return;
                fusionDone = true;
                // Progreso: la fusión cuenta y la carta resultante entra en la colección.
                recordFusion((playerData && playerData.username) || 'Jugador');
                recordCollectedCard((playerData && playerData.username) || 'Jugador', fusionResult.type, fusionResult.level);
                turnController.animationComplete();
                turnController.afterPlayerAction();
            };

            this.scene.tweens.add({
                targets: fusedCardObject,
                alpha: { from: 0, to: 1 },
                duration: 200,
                ease: 'Power2',
                onComplete: finishFusion
            });

            // Margen de seguridad por si el tween no completa.
            this.scene.time.delayedCall(600, finishFusion);
        });
    }

    /**
     * Aplica los resets de restricciones por nivel al iniciar el turno propio.
     * La regla vive en LevelAttackRule.
     */
    refreshCardTurnMetadata(cardObject, ownerType) {
        const ownTurnNumber = ownerType === 'player' ? this.ctx.turn.playerTurnNumber : this.ctx.turn.opponentTurnNumber;
        const state = LevelAttackRule.startOfTurn(
            {
                lastAttackedTurn: cardObject.getData('lastAttackedTurn') || null,
                consecutiveAttacks: cardObject.getData('consecutiveAttacks') || 0,
                blockedTurn: cardObject.getData('blockedTurn') || null
            },
            ownTurnNumber
        );
        cardObject.setData('consecutiveAttacks', state.consecutiveAttacks);
        cardObject.setData('blockedTurn', state.blockedTurn);
    }

    /**
     * Prepara el campo del jugador al inicio de su turno: reduce cooldowns y
     * refresca las restricciones de ataque por nivel.
     */
    preparePlayerFieldForTurn() {
        const playerFieldCardObjects = this.scene.children.list.filter(c => c.getData('isCardOnField') && !c.getData('isOpponentCard'));
        playerFieldCardObjects.forEach(cardObj => {
            let cooldown = cardObj.getData('cooldown') || 0;
            if (cooldown > 0) {
                cooldown = Math.max(0, cooldown - 1);
                cardObj.setData('cooldown', cooldown);
            }
            this.refreshCardTurnMetadata(cardObj, 'player');
        });
    }

    /**
     * Prepara el campo del oponente al inicio de su turno (restricciones por nivel).
     */
    prepareOpponentFieldForTurn() {
        const opponentFieldCardObjects = this.scene.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField'));
        opponentFieldCardObjects.forEach(cardObj => this.refreshCardTurnMetadata(cardObj, 'opponent'));
    }

    /**
     * Contabiliza un ataque por nivel. La transición de estado (bloqueos del
     * nivel 2/3 y ataques consecutivos) es resuelta por LevelAttackRule.
     */
    registerCardAttack(cardObject, ownerType) {
        const cardData = cardObject.getData('cardData') || cardObject.cardData;
        const level = cardData.level || 1;
        const nowTurn = ownerType === 'player' ? this.ctx.turn.playerTurnNumber : this.ctx.turn.opponentTurnNumber;

        // Progreso: los ataques del jugador alimentan la misión de tipos y la colección.
        if (ownerType === 'player' && cardData.type) {
            const username = (this.ctx.playerData && this.ctx.playerData.username) || 'Jugador';
            recordAttackWithType(username, cardData.type);
            recordCollectedCard(username, cardData.type, cardData.level);
        }

        const state = LevelAttackRule.registerAttack({
            level,
            nowTurn,
            lastAttackedTurn: cardObject.getData('lastAttackedTurn') || null,
            consecutiveAttacks: cardObject.getData('consecutiveAttacks') || 0
        });
        cardObject.setData('lastAttackedTurn', state.lastAttackedTurn);
        cardObject.setData('consecutiveAttacks', state.consecutiveAttacks);
        cardObject.setData('blockedTurn', state.blockedTurn);
        if (state.blockedTurn !== null) {
            console.log(`[GameScene] Carta ${cardData.id} bloqueada para el turno ${state.blockedTurn} (nivel ${level}).`);
        }
    }
}
