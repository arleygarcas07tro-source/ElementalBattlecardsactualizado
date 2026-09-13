import Phaser from 'phaser';
import { calculateRowPositions } from '../helpers/zone';
import { resolveCombat } from '../helpers/combat';
import { playFusionFx, playImpactFx, playDeathFx, playFireworksFx, TYPE_COLORS } from '../helpers/cardFx';
import { play as playSfx } from '../helpers/audioManager.js';
import {
    recordVictory,
    recordDefeat,
    recordFusion,
    recordFieldComplete,
    recordLevel3Win,
    recordAttackWithType,
    recordCollectedCard
} from '../helpers/playerProgress.js';
import Player from '../game_objects/player.js';
import Card from '../game_objects/card.js';
import { CARD_TYPES, GAME_CONFIG } from '../helpers/constants.js';
import TurnManager from '../game/TurnManager.js';
import BotAI from '../game/BotAI.js';
import VictoryEvaluator from '../game/VictoryEvaluator.js';
import LANClient from '../game/LANClient.js';
import LevelAttackRule from '../game/LevelAttackRule.js';
import EssencePowerService from '../game/EssencePowerService.js';
import ConvergenceService from '../game/ConvergenceService.js';

/**
 * La escena principal donde se desarrolla el juego de cartas.
 * Se encarga del tablero, las manos de los jugadores y la lógica del juego.
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerData = null; // Propiedad para guardar los datos del jugador
        this.socket = null;
        this.isLAN = false;
        this.roomCode = null;
        this.playerRole = null; // 'host' o 'guest' en modo LAN
        // Activar logs de sincronización cuando sea necesario
        this.debugSync = true;
        this.gameStartData = null; // Datos de inicio del juego en modo LAN
        this.vsBot = false;
        this.selectedCard = null; // Propiedad para la carta seleccionada
        // Eliminamos las escalas antiguas. Ahora usaremos un tamaño fijo.
        // El tamaño de las cartas será igual al de los slots.
        // Tamaños visuales fijos para normalizar tamaño real de todas las texturas
        this.cardHandSize = { width: 110, height: 158 }; // tamaño visual en mano
        this.cardFieldSize = { width: 110, height: 158 }; // tamaño visual en campo / fusiones

        // Flujo de turnos (estado, contadores y reglas) delegado a TurnManager.
        this.turn = new TurnManager(GAME_CONFIG);
        this.turnTimer = null; // Referencia al temporizador del turno
    }

    /**
     * El método init se ejecuta antes que create y es ideal para recibir datos.
     * @param {object} data - Datos pasados desde la escena anterior.
     */
    init(data) {
        // data puede contener: playerData, socket, isLAN, roomCode, vsBot, playerRole, gameStartData, botDifficulty
        this.playerData = data.playerData || data;
        this.socket = data.socket || null;
        this.isLAN = !!data.isLAN;
        this.roomCode = data.roomCode || null;
        this.playerRole = data.playerRole || null;
        this.gameStartData = data.gameStartData || null;
        this.vsBot = !!data.vsBot;
        this.bot = new BotAI(data.botDifficulty || 3); // 1-10, default: Normal (3)
        console.log('GameScene iniciada con los datos del jugador:', this.playerData);
        console.log('Modo LAN:', this.isLAN, 'Rol:', this.playerRole);
        console.log('Dificultad del bot:', this.bot.difficulty, '(1=Muy Fácil, 10=Mito)');
    }

    preload() {
        // Fondo general
        this.load.video('campo-video', '/assets/images/campo juego/battlefield_fixed.mp4', { muted: true, noAudio: true });

        // Slots
        this.load.image('slot', '/assets/images/cartas/Espacio vacio.png');

        // Cartas nivel 1
        this.load.image('card-fuego-1', '/assets/images/cartas/carta-fuego-1.jpeg');
        this.load.image('card-agua-1', '/assets/images/cartas/carta-agua-1.jpeg');
        this.load.image('card-planta-1', '/assets/images/cartas/carta-planta-1.jpeg');
        this.load.image('card-luz-1', '/assets/images/cartas/carta-luz-1.jpeg');
        this.load.image('card-sombra-1', '/assets/images/cartas/carta-sombra-1.jpeg');
        this.load.image('card-espiritu-1', '/assets/images/cartas/carta-espiritu-1.jpeg');

        //cartas nivel 2
        this.load.image('card-fuego-2', '/assets/images/cartas/carta-fuego-2.jpeg');
        this.load.image('card-agua-2', '/assets/images/cartas/carta-agua-2.jpeg');
        this.load.image('card-planta-2', '/assets/images/cartas/carta-planta-2.jpeg');
        this.load.image('card-luz-2', '/assets/images/cartas/carta-luz-2.jpeg');
        this.load.image('card-sombra-2', '/assets/images/cartas/carta-sombra-2.jpeg');
        this.load.image('card-espiritu-2', '/assets/images/cartas/carta-espiritu-2.jpeg');
        
        //cartas nivel 3
        this.load.image('card-fuego-3', '/assets/images/cartas/carta-fuego-3.jpeg');
        this.load.image('card-agua-3', '/assets/images/cartas/carta-agua-3.jpeg');
        this.load.image('card-planta-3', '/assets/images/cartas/carta-planta-3.jpeg');
        this.load.image('card-luz-3', '/assets/images/cartas/carta-luz-3.jpeg');
        this.load.image('card-sombra-3', '/assets/images/cartas/carta-sombra-3.jpeg');
        this.load.image('card-espiritu-3', '/assets/images/cartas/carta-espiritu-3.jpeg');
        
        //mazo reverso
        this.load.image('card-back-opponent', '/assets/images/cartas/baraja-oponente.png');
        this.load.image('card-back-player', '/assets/images/cartas/baraja-jugador.png');
    }

    create() {
        // Limpieza de objetos visuales de partidas previas (si la escena se reutiliza)
        // Decoración del campo (emblema, marcos, runas, energía).
        if (this.fieldDecor) {
            try { this.fieldDecor.destroy(); } catch (e) { /* ignore */ }
            this.fieldDecor = null;
        }
        try {
            // Tomamos una copia porque destroy modifica children.list
            const childrenCopy = this.children ? this.children.list.slice() : [];
            childrenCopy.forEach(child => {
                if (!child) return;
                // Detectar objetos tipo 'Card' por su metadata 'cardData'
                let hasCardData = false;
                try { hasCardData = !!(child.getData && child.getData('cardData')); } catch(e) { hasCardData = false; }

                // Detectar slots por nombre (creados con setName(`${name}-${i}`))
                const name = child.name || '';
                const isSlot = typeof name === 'string' && (
                    name.startsWith('player-slots') || name.startsWith('opponent-slots') ||
                    name.startsWith('player_battle_slots') || name.startsWith('opponent_battle_slots')
                );

                // Detectar elementos de UI/mazo/tablero por textura keys conocidas
                let isBoardOrDeck = false;
                try {
                    const tex = child.texture && child.texture.key;
                    if (tex === 'board-bg' || tex === 'slot' || tex === 'card-back-player' || tex === 'card-back-opponent') isBoardOrDeck = true;
                } catch(e) { isBoardOrDeck = false; }

                if (hasCardData || isSlot || isBoardOrDeck) {
                    try { if (child.destroy) child.destroy(); } catch (e) { /* ignore */ }
                }
            });
        } catch (e) {
            console.warn('[GameScene] Error durante limpieza inicial:', e);
        }

        // Reset / inicialización por si la escena se reutiliza entre partidas
        this.turn.reset();
        // Set para marcar destrucciones en curso y evitar doble procesamiento
        this._pendingDestroys = new Set();

        // Poderes de esencia: la UIScene emite la solicitud al hacer clic en un
        // orbe propio. La validación vive en EssencePowerService.
        this.events.on('request-essence-power', this.useEssencePower, this);

        // Mostramos un mensaje de bienvenida con el nombre del usuario temporal.
        console.log(`¡Bienvenido a GameScene, ${this.playerData?.username || 'Jugador'}!`);
        // Si estamos en modo LAN y tenemos socket, conectar manejadores de red
        if (this.isLAN && this.socket) {
            this.lan = new LANClient(this.socket, this.playerRole);
            this.lan.onGameEvent((payload) => {
                try {
                    this.handleRemoteGameEvent(payload);
                } catch (e) {
                    console.error('Error manejando evento remoto:', e);
                }
            });

            // Listener para cambios de turno
            this.lan.onTurnChanged((data) => {
                console.log('[GameScene] Cambio de turno recibido', { currentTurn: data.currentTurn, data });
                // Verificar si es nuestro turno
                if (data.currentTurn === this.playerRole) {
                    this.startPlayerTurn();
                } else {
                    this.startOpponentTurn();
                }
            });
        }
        const { width, height } = this.scale;
        const battleRowYOffset = 70; // Distancia de las filas de batalla al centro
        // Lanza la escena de UI en paralelo para que se muestre por encima.
        // Si ya existe una instancia previa, detenerla primero para evitar duplicados.
        if (this.scene.isActive('UIScene') || this.scene.isSleeping('UIScene')) {
            this.scene.stop('UIScene');
        }
        this.scene.launch('UIScene', { playerData: this.playerData });

        // ---------- LÓGICA DE JUGADORES ----------
        // Creamos las instancias de los jugadores. La clase Player se encargará de su propio mazo y mano.
        this.player = new Player('player', this);
        this.opponent = new Player('opponent', this);

        this.player.drawInitialHand();
        this.opponent.drawInitialHand();

        // Registramos las cartas iniciales de la mano del jugador como coleccionadas.
        const username = (this.playerData && this.playerData.username) || 'Jugador';
        (this.player.hand || []).forEach(card => {
            if (card && card.type) recordCollectedCard(username, card.type, card.level);
        });

        // Fondo centrado
        this.board = this.add.video(width / 2, height / 2, 'campo-video')
            .setOrigin(0.5);

        // Enviamos el tablero al fondo de la lista de renderizado.
        this.board.setDepth(-1);

        // Bucle continuo: al crearse el elemento, se fuerza que repita al terminar.
        this.board.once('created', (videoEl) => {
            videoEl.loop = true;
            videoEl.muted = true;
        });

        // El video necesita un momento para cargar sus metadatos (dimensiones).
        // Usamos el evento 'play' para asegurarnos de que tenemos el tamaño correcto antes de escalar.
        this.board.on('play', () => {
            // Escalar para cubrir todo el canvas manteniendo la proporción (cover).
            const scaleX = width / this.board.width;
            const scaleY = height / this.board.height;
            const scale = Math.max(scaleX, scaleY);
            this.board.setScale(scale);
        });
        this.board.play(true); // Reproducir en bucle

        // Decoración visual del campo (emblema dorado, marcos, runas y energía).
        // Se crea bajo los slots/cartas para no interferir con la jugabilidad.
        this.createFieldDecor();

        // ---------- ZONA DE MANO DEL OPONENTE (4 espacios) ----------
        this.createSlotsRow(height * 0.18, 'opponent-slots');
        this.createCardsRow(height * 0.18, 'opponent-cards', this.opponent.hand);

        // ---------- CENTRO (campo de batalla con 6 espacios) ----------
        this.createSlotsRow(height * 0.45 - battleRowYOffset, 'opponent_battle_slots', 6); // Fila del oponente
        this.createSlotsRow(height * 0.55 + battleRowYOffset, 'player_battle_slots', 6);   // Fila del jugador

        // ---------- ZONA DE MANO DEL JUGADOR (4 espacios) ----------
        this.createSlotsRow(height * 0.825, 'player-slots');
        this.createCardsRow(height * 0.825, 'player-cards', this.player.hand);

        // ---------- MAZOS ----------
        this.createDecks();

        // Avisar a la UI que la escena se creó exitosamente
        this.events.emit('board-ready');

        // --- Lógica de Clic para Deseleccionar ---
        // Si hacemos clic en el tablero, deseleccionamos cualquier carta.
        this.board.setInteractive();
        this.board.on('pointerdown', () => this.deselectCard());


        // --- Lógica de Inicio de Partida ---
        // La partida no comienza hasta que la UI nos avise.
        // Evitar duplicar listeners si create() se llama varias veces.
        this.events.off('start-game');
        this.events.on('start-game', () => {
            if (this.turn.state === 'pre-start') {
                console.log('[GameScene] ¡La partida ha comenzado!', { player: this.playerData?.username || 'Jugador' });
                
                // En modo LAN, solo el host comienza su turno, el guest espera
                if (this.isLAN) {
                    if (this.playerRole === 'host') {
                        this.startPlayerTurn();
                    } else {
                        // El guest espera su turno
                        this.turn.beginOpponentWait();
                        this.events.emit('update-turn-indicator', 'opponent');
                        console.log('[GameScene] Esperando turno del oponente (eres guest)');
                    }
                } else {
                    // Modo local o vs bot: el jugador siempre empieza
                    this.startPlayerTurn();
                }
            } else {
                console.log('[GameScene] start-game ignorado', { estadoActual: this.turn.state });
            }
        });

        // Cleanup al apagar la escena: evitar listeners y escenas hijas corriendo.
        this.events.off('shutdown');
        this.events.on('shutdown', () => {
            // remover listeners propios
            this.events.off('start-game');
            // detener la UIScene si está activa
            if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');
            // destruir temporizador si sigue activo
            if (this.turnTimer) { this.turnTimer.destroy(); this.turnTimer = null; }
        });

        // Ya no hay botón "Terminar turno": el turno termina automáticamente
        // al ejecutar una acción o por timeout. No registramos listener 'end-player-turn'.
    }


    /**
     * Gestiona la lógica cuando un jugador intenta jugar una carta de la mano a un slot.
     * @param {Phaser.GameObjects.Image} cardObject El objeto de la carta arrastrada.
     * @param {Phaser.GameObjects.Image} dropZone El slot del campo de batalla.
     */
    handlePlayCard(cardObject, dropZone) {
        // Bloquear jugadas si no es el turno del jugador o ya actuó, o si está obligado a atacar
        if (this.turn.state !== 'player-turn') return;
        if (this.turn.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }
        if (this.turn.playerMustAttackThisTurn) {
            console.log('[GameScene] Estás obligado a atacar este turno. No puedes colocar cartas.');
            return;
        }

        // Obtenemos los datos de la carta seleccionada y el índice del slot.
        const cardDataFromHand = this.selectedCard.cardData;
        const fieldIndex = parseInt(dropZone.name.split('-')[1]);
        const targetCardData = this.player.field.get(fieldIndex);

        console.log('[GameScene] Intento de jugar carta en slot', { slotIndex: fieldIndex, cardFromHand: cardDataFromHand && { id: cardDataFromHand.id, instanceId: cardDataFromHand.instanceId, type: cardDataFromHand.type, level: cardDataFromHand.level } });
        if (this.debugSync) {
            console.log('[GameScene][debug] pre-play state:', {
                playerField: this.player.field.snapshot().map(f => f && f.instanceId),
                playerHand: this.player.hand.map(h => h && h.instanceId),
                targetSlotIndex: fieldIndex,
                timestamp: Date.now()
            });
        }

        // Escenario 1: El slot está vacío. Jugamos la carta normalmente.
        if (targetCardData === null) {
            const cardPlayed = this.player.playCardFromHand(cardDataFromHand.instanceId, fieldIndex);
            if (this.debugSync) console.log('[GameScene][debug] playCardFromHand result', { cardPlayed: cardPlayed && cardPlayed.instanceId, fieldIndex, timestamp: Date.now() });
            if (!cardPlayed) {
                console.log('El slot ya estaba ocupado (verificación secundaria). La carta volverá a la mano.');
                return; // No hacemos nada más, dragend la devolverá.
            }

            // Actualizamos el cardData del objeto visual con los datos del modelo (incluye instanceId)
            this.selectedCard.cardData = cardPlayed;
            // Asegurar que el sprite y su metadata usan el instanceId definitivo
            if (cardPlayed && cardPlayed.instanceId) {
                try { this.selectedCard.setName(cardPlayed.instanceId); } catch (e) {}
                try { this.selectedCard.setData('instanceId', cardPlayed.instanceId); } catch (e) {}
            }

            // Detenemos cualquier animación activa en la carta seleccionada
            if (this.selectedCard.activeTween) {
                this.selectedCard.activeTween.stop();
            }

            // Animamos la carta para que se mueva al slot
            this.tweens.add({
                targets: this.selectedCard,
                x: dropZone.x,
                y: dropZone.y,
                duration: 150,
                ease: 'Power1',
                onComplete: () => {
                    // Toda la lógica que ocurre después de jugar la carta se mueve aquí,
                    // dentro del 'onComplete' de la animación.

                    // 1. Actualizamos las propiedades de la carta para reflejar que está en el campo.
                    // Ahora es seguro llamar a setInteractive porque la carta no ha sido destruida.
                    if (!this.selectedCard.input) {
                        this.selectedCard.setInteractive();
                    }
                    this.selectedCard.input.cursor = 'pointer';
                    this.selectedCard.setData('isCardOnField', true);
                    this.selectedCard.setData('cardData', cardPlayed);
                    if (cardPlayed && cardPlayed.instanceId) {
                        try { this.selectedCard.setName(cardPlayed.instanceId); } catch (e) {}
                        try { this.selectedCard.setData('instanceId', cardPlayed.instanceId); } catch (e) {}
                    }
                    this.selectedCard.setData('fieldIndex', fieldIndex);
                    this.selectedCard.setData('isRevealed', false);
                    this.selectedCard.setData('startPosition', { x: dropZone.x, y: dropZone.y });

                    // 2. La carta jugada ya no es parte de la mano visual.
                    this['player-cards'] = this['player-cards'].filter(card => card !== this.selectedCard);
                    this.deselectCard(false); // Deseleccionamos sin animar.

                    // 3. Robamos, refrescamos la mano y actualizamos contadores.
                    this.player.drawCard();
                    playSfx('card', this);
                    playSfx('draw', this);
                    this.refreshPlayerHand();
                    this.updateDeckCounts();

                            // 4. Marcamos la acción y terminamos el turno.
                    this.turn.playerHasActed = true;
                            console.log('[GameScene] Jugador colocó carta en el campo', { cardId: cardPlayed.id, instanceId: cardPlayed.instanceId, type: cardPlayed.type, level: cardPlayed.level, fieldIndex });
                    // Registrar la carta como coleccionada.
                    recordCollectedCard((this.playerData && this.playerData.username) || 'Jugador', cardPlayed.type, cardPlayed.level);
                    // Emitir evento de juego a oponente si estamos en LAN
                        if (this.isLAN && this.socket) {
                        if (this.debugSync) console.log('[GameScene][debug] emitiendo play_card payload', { payload: { type: 'play_card', card: cardPlayed, fieldIndex }, timestamp: Date.now() });
                        this.lan.emitGameEvent({ type: 'play_card', card: cardPlayed, fieldIndex });
                    }

                    this.endPlayerTurn();
                }
            });

        // Escenario 2: El slot está OCUPADO.
        } else {
            console.log(`Slot ${fieldIndex} ocupado. No se puede jugar la carta aquí. La carta volverá a la mano.`);
            // No hacemos nada. La bandera 'dropped' sigue en false y el evento 'dragend' la devolverá.
        }
    }

    /**
     * Intenta fusionar dos cartas en el campo de batalla.
     * @param {Phaser.GameObjects.Image} selectedCardObject La carta que el jugador seleccionó.
     * @param {Phaser.GameObjects.Image} targetCardObject La carta sobre la que se soltó la primera.
     */
    attemptToFuse(selectedCardObject, targetCardObject) {
        // Bloquear fusiones si no es turno o ya actuó
        if (this.turn.state !== 'player-turn') return;
        if (this.turn.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }
        if (this.turn.playerMustAttackThisTurn) {
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

        // TODO: Validar que el jugador tiene una acción disponible para fusionar.

        // --- Ejecutar Fusión ---
        // 3. Asegurar sincronía entre la vista y el modelo antes de actualizar datos.
        const selIdx = selectedCardObject.getData('fieldIndex');
        const tgtIdx = targetIndex;

        const ensureModelAt = (idx, cardObj) => {
            if (typeof idx !== 'number') return;
            if (!this.player.field.get(idx)) {
                const cd = (cardObj.getData && cardObj.getData('cardData')) || cardObj.cardData;
                if (cd) {
                    console.warn('[GameScene] Sincronizando modelo: rellenando player.field slot [' + idx + '] desde objeto visual', cd);
                    this.player.field.set(idx, cd);
                }
            } else {
                // Si existe modelo pero difiere de la vista, informar
                const modelCd = this.player.field.get(idx);
                const viewCd = (cardObj.getData && cardObj.getData('cardData')) || cardObj.cardData;
                if (viewCd && modelCd.instanceId && viewCd.instanceId && modelCd.instanceId !== viewCd.instanceId) {
                    console.warn('[GameScene] Desincronización detectada en slot', idx, 'modelo.instanceId=', modelCd.instanceId, 'vista.instanceId=', viewCd.instanceId);
                }
            }
        };

        ensureModelAt(selIdx, selectedCardObject);
        ensureModelAt(tgtIdx, targetCardObject);

        // 3. Actualizar el modelo de datos.
        const fusionResult = this.player.fuseCards(selIdx, tgtIdx);
        console.log('[GameScene] Fusión de campo procesada', { sourceIndex: selIdx, targetIndex: tgtIdx, result: fusionResult });
        if (!fusionResult) {
            console.error("Error en el modelo de datos al fusionar.");
            this.deselectCard();
            return;
        }

        // Para "reiniciar" el slot de destino, lo desactivamos temporalmente.
        // La nueva carta fusionada, al ser una dropzone, se encargará de capturar
        // los eventos de 'drop' en esa posición.
        const targetSlot = this['player_battle_slots'][targetIndex];
        if (targetSlot) targetSlot.disableInteractive();

        const fusedCardData = fusionResult.newCard;
        // Reactivamos el slot que el modelo nos dice que se ha vaciado.
        const originalSlot = this['player_battle_slots'][fusionResult.emptiedIndex];
        if (originalSlot) originalSlot.setInteractive({ dropZone: true });


        // 4. Consumir la acción.
        this.turn.playerHasActed = true;

        // Emitir evento de fusión si estamos en LAN
        if (this.isLAN && this.socket) {
            this.lan.emitGameEvent({
                type: 'fuse_cards',
                sourceIndex: selIdx,
                targetIndex: tgtIdx,
                resultCard: fusedCardData
            });
        }

        this.deselectCard(false); // Deseleccionamos sin animar.

        // 5. Animar la fusión: la fuente converge sobre el objetivo, ambas
        //    emiten destello + partículas del tipo antes de desaparecer.
        this.tweens.killTweensOf(selectedCardObject); // Evita el "lift" de selección en curso.
        this.turn.onBlockingAnimationStarted();
        playFusionFx(this, { sourceCard: selectedCardObject, targetCard: targetCardObject, type: fusedCardData.type }, () => {
            // 6. Crear la carta resultante sin alterar su tamaño: fade-in + fuegos artificiales.
            const fusedCardObject = this.createFieldCardAt(fusionPosition.x, fusionPosition.y, fusedCardData, { isOpponent: false, revealed: true, fieldIndex: targetIndex });
            fusedCardObject.setAlpha(0);
            playFireworksFx(this, fusionPosition.x, fusionPosition.y - 10, TYPE_COLORS[fusedCardData.type] || 0xffffff);

            // El fin de la fusión se garantiza con un timer: si la carta resultante
            // se destruye antes de completar el fade-in, Phaser cancelaría el
            // onComplete y el juego se quedaría congelado.
            let fusionDone = false;
            const finishFusion = () => {
                if (fusionDone) return;
                fusionDone = true;
                console.log('[GameScene] Carta fusionada creada en campo', { fieldIndex: targetIndex, fusedCard: fusedCardData });
                // Progreso: la fusión cuenta y la carta resultante entra en la colección.
                recordFusion((this.playerData && this.playerData.username) || 'Jugador');
                recordCollectedCard((this.playerData && this.playerData.username) || 'Jugador', fusedCardData.type, fusedCardData.level);
                this._animationComplete();
                this.endPlayerTurn();
            };

            this.tweens.add({
                targets: fusedCardObject,
                alpha: { from: 0, to: 1 },
                duration: 380,
                ease: 'Power2',
                onComplete: finishFusion
            });

            // Red de seguridad: fade-in 380 ms cubierto con margen amplio.
            this.time.delayedCall(1300, finishFusion);
        });
    }

    /**
     * Intenta fusionar una carta de la mano con una carta en el campo.
     * @param {Card} handCardObject La carta seleccionada de la mano.
     * @param {Card} fieldCardObject La carta objetivo en el campo.
     */
    attemptToFuseFromHand(handCardObject, fieldCardObject) {
        // Bloquear si ya actuó o debe atacar
        if (this.turn.state !== 'player-turn') return;
        if (this.turn.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }
        if (this.turn.playerMustAttackThisTurn) {
            console.log('[GameScene] Estás obligado a atacar este turno. No puedes fusionar.');
            return;
        }

        const handCardData = handCardObject.cardData;
        const fieldCardData = fieldCardObject.cardData;
        const targetIndex = fieldCardObject.getData('fieldIndex');

        console.log('[GameScene] Intento de fusión desde la mano', { handCardId: handCardData.id, fieldCardId: fieldCardData.id, targetIndex });

        // 1. Llamamos al modelo del jugador para que gestione la fusión.
        const fusionResult = this.player.fuseFromHand(handCardData.instanceId, targetIndex);

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
        this.turn.playerHasActed = true;
        if (this.isLAN && this.socket) {
            this.lan.emitGameEvent({
                type: 'fuse_from_hand',
                handCardId: handCardData.instanceId,
                targetIndex: targetIndex,
                resultCard: fusionResult
            });
        }

        // 5. Animar la fusión: la carta de la mano converge sobre la del campo.
        this.tweens.killTweensOf(handCardObject); // Evita el "lift" de selección en curso.
        this.turn.onBlockingAnimationStarted();
        playFusionFx(this, { sourceCard: handCardObject, targetCard: fieldCardObject, type: fusionResult.type }, () => {
            // 6. Reponer la carta usada desde la mano (tras destruirse el origen en el efecto).
            this.player.drawCard();
            this.refreshPlayerHand();
            this.updateDeckCounts();

            // 7. Crear la carta resultante sin alterar su tamaño: fade-in + fuegos artificiales.
            console.log('[GameScene] Carta fusionada (mano->campo) creada', { fieldIndex: targetIndex, fusedCard: fusionResult });
            const fusedCardObject = this.createFieldCardAt(fusionPosition.x, fusionPosition.y, fusionResult, { isOpponent: false, revealed: true, fieldIndex: targetIndex });
            fusedCardObject.setAlpha(0);
            playFireworksFx(this, fusionPosition.x, fusionPosition.y - 10, TYPE_COLORS[fusionResult.type] || 0xffffff);

            // El fin de la fusión se garantiza con un timer: si la carta resultante
            // se destruye antes de completar el fade-in, Phaser cancelaría el
            // onComplete y el juego se quedaría congelado.
            let fusionDone = false;
            const finishFusion = () => {
                if (fusionDone) return;
                fusionDone = true;
                // Progreso: la fusión cuenta y la carta resultante entra en la colección.
                recordFusion((this.playerData && this.playerData.username) || 'Jugador');
                recordCollectedCard((this.playerData && this.playerData.username) || 'Jugador', fusionResult.type, fusionResult.level);
                this._animationComplete();
                this.endPlayerTurn();
            };

            this.tweens.add({
                targets: fusedCardObject,
                alpha: { from: 0, to: 1 },
                duration: 380,
                ease: 'Power2',
                onComplete: finishFusion
            });

            // Red de seguridad: fade-in 380 ms cubierto con margen amplio.
            this.time.delayedCall(1300, finishFusion);
        });
    }

    /**
     * Inicia y ejecuta la lógica del turno del oponente.
     * Esta es un boot muy simple para fines de prueba. (En mejora continua, tendra tres niveles de dificultad.)
     */
    startOpponentTurn() {
        this.turn.beginOpponentTurn();

        // Poder ESPÍRITU (Conducto): bloquea la convergencia rival 1 turno.
        if (this.turn.opponentConvergenceBlocked) {
            this.turn.opponentConvergenceBlocked = false;
            this.turn.opponentConvergenceArmed = false;
            console.log('[GameScene] Conducto: la Convergencia del oponente queda anulada este turno.');
            this.refreshConvergenceStatusUi();
        } else if (this.turn.opponentConvergenceArmed
            && ConvergenceService.isConverged(this.opponent.field.types(), GAME_CONFIG.UNIQUE_TYPES_TO_WIN)) {
            console.log('[GameScene] CONVERGENCIA: el oponente conservó los 6 tipos un turno completo.');
            this.endGame('opponent');
            return;
        }

        let opponentHasActed = false;

        // Limpieza de restricciones de ataque por nivel al comenzar el turno (regla central en LevelAttackRule)
        const opponentFieldCardObjects = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField'));
        opponentFieldCardObjects.forEach(cardObj => this._refreshCardTurnMetadata(cardObj, 'opponent'));

        // 🎮 EN MODO LAN: No ejecutar IA, solo esperar acciones del oponente remoto
        if (this.isLAN) {
            console.log('[GameScene] Inicio del turno del OPONENTE (LAN) - esperando acción remota', { turnNumber: this.turn.opponentTurnNumber });
            this.events.emit('update-turn-indicator', 'opponent');
            // El oponente jugará desde su cliente, los eventos llegarán por socket
            return;
        }

        // 🤖 MODO BOT: Ejecutar IA del oponente
        console.log('[GameScene] IA del oponente evaluando acciones (BOT)', { turnNumber: this.turn.opponentTurnNumber });

        this.bot.refreshActionDelay();
        this.bot.refreshScoreModifier();

        this.time.delayedCall(this.bot.actionDelay, () => {
            // Revalúa el plan mientras el plan falle (ej. fusión inválida) hasta ejecutar una acción.
            let safety = 10;
            let executed = false;
            while (!executed && safety-- > 0) {
                const plan = this.bot.decideAction(this.buildBotContext());
                executed = this.executeBotPlan(plan);
            }
            if (!executed) {
                this.endOpponentTurn(false);
            }
        });
    }

    /**
     * Construye el contexto de decisión del bot a partir del tablero (modelo + objetos visuales).
     * @returns {object} Contexto consumible por BotAI.decideAction.
     */
    buildBotContext() {
        const fieldCardObjects = this.children.list.filter(c => c.getData('isCardOnField'));
        const opponentAttackers = fieldCardObjects
            .filter(c => c.getData('isOpponentCard') && c.getData('blockedTurn') !== this.turn.opponentTurnNumber)
            .map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));
        const bestAttackPool = fieldCardObjects
            .filter(c => c.getData('isOpponentCard') && (c.getData('cooldown') || 0) === 0 && c.getData('blockedTurn') !== this.turn.opponentTurnNumber)
            .map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));
        const playerFieldCards = fieldCardObjects
            .filter(c => !c.getData('isOpponentCard'))
            .map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));
        return {
            opponent: this.opponent,
            mustAttack: this.turn.opponentMustAttackThisTurn,
            playerHasField: this.player.field.hasAny(),
            opponentAttackers,
            bestAttackPool,
            revealedDefenders: playerFieldCards.filter(pair => {
                const obj = this.children.list.find(c => c.getData('isCardOnField') && !c.getData('isOpponentCard') && c.getData('fieldIndex') === pair.index);
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
    executeBotPlan(plan) {
        switch (plan.kind) {
            case 'fusion': return this.executeBotFusion(plan);
            case 'attack': return this.executeBotAttack(plan);
            case 'directAttack': return this.executeBotDirectAttack(plan);
            case 'playCard': return this.executeBotPlayCard(plan);
            default: return false; // pass
        }
    }

    /**
     * Busca el objeto visual de una carta del oponente (en campo) por su índice de slot.
     * @param {number} fieldIndex Índice de slot del campo del oponente.
     * @returns {object|null}
     */
    findOpponentCardObject(fieldIndex) {
        return this.children.list.find(c => c.getData('isOpponentCard') && c.getData('isCardOnField') && c.getData('fieldIndex') === fieldIndex);
    }

    /**
     * Busca el objeto visual de una carta del jugador (en campo) por su índice de slot.
     * @param {number} fieldIndex Índice de slot del campo del jugador.
     * @returns {object|null}
     */
    findPlayerCardObject(fieldIndex) {
        return this.children.list.find(c => !c.getData('isOpponentCard') && c.getData('isCardOnField') && c.getData('fieldIndex') === fieldIndex);
    }

    /**
     * Ejecuta la fusión de campo decidida por el bot.
     * @param {object} plan Plan { kind: 'fusion', indices: number[] }.
     * @returns {boolean} true si la fusión se ejecutó.
     */
    executeBotFusion(plan) {
        if (this.debugSync) console.log('[GameScene][debug] Oponente BOT fusionando campo', { indices: plan.indices, timestamp: Date.now() });
        const [idxA, idxB] = plan.indices;
        const origA = this.opponent.field.get(idxA);
        const origB = this.opponent.field.get(idxB);
        const res = this.opponent.fuseCards(idxA, idxB);
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
            const obj = this.children.list.find(child => {
                const cd = child.getData('cardData') || child.cardData;
                if (!cd || !cd.instanceId) return false;
                return cd.instanceId === id && child.getData('isOpponentCard') && child.getData('isCardOnField');
            });
            if (obj) obj.destroy();
        });
        const existing = this.findCardObjectOnField(targetIndex);
        if (existing && existing.getData('isOpponentCard')) existing.destroy();
        const slotObj = this['opponent_battle_slots'][targetIndex];
        const fusedObj = this.createFieldCard(slotObj, res.newCard, { isOpponent: true, revealed: true, fieldIndex: targetIndex });
        try { fusedObj.setTexture(`card-${res.newCard.type}-${res.newCard.level}`); } catch (e) {}
        this.refreshOpponentHand();
        this.updateDeckCounts();
        this.endOpponentTurn(true);
        return true;
    }

    /**
     * Ejecuta el ataque (calculado o aleatorio) decidido por el bot.
     * @param {object} plan Plan { kind: 'attack', attackerIndex, defenderIndex }.
     * @returns {boolean} true si el ataque se lanzó.
     */
    executeBotAttack(plan) {
        const attackerObj = this.findOpponentCardObject(plan.attackerIndex);
        const defenderObj = this.findPlayerCardObject(plan.defenderIndex);
        if (!attackerObj || !defenderObj) return false;
        if (this.debugSync) console.log('[GameScene][debug] Oponente BOT atacando', { attackerIndex: plan.attackerIndex, defenderIndex: plan.defenderIndex, timestamp: Date.now() });
        this.revealOpponentCard(attackerObj);
        this.revealPlayerCard(defenderObj);
        const res = resolveCombat(attackerObj.getData('cardData'), defenderObj.getData('cardData'));
        this._registerCardAttack(attackerObj, 'opponent');
        this.tweens.add({
            targets: attackerObj, x: defenderObj.x, y: defenderObj.y, duration: 200, yoyo: true, ease: 'Power1',
            onComplete: () => {
                if (res.loser === 'attacker') this.destroyCard(this.opponent, attackerObj.getData('fieldIndex'));
                else if (res.loser === 'defender') {
                    this.destroyCard(this.player, defenderObj.getData('fieldIndex'));
                    // Regla de esencias: el atacante (bot) gana el combate y llena la esencia de su tipo.
                    const winnerData = attackerObj.getData('cardData') || attackerObj.cardData;
                    if (winnerData && winnerData.type) this.opponent.fillEssence(winnerData.type);
                }
                this.turn.opponentPerformedAttackThisTurn = true;
                this.endOpponentTurn(true);
            }
        });
        return true;
    }

    /**
     * Ejecuta el ataque directo (sin defensas) decidido por el bot.
     * @param {object} plan Plan { kind: 'directAttack', attackerIndex }.
     * @returns {boolean} true si el ataque directo se ejecutó.
     */
    executeBotDirectAttack(plan) {
        const attackerObj = this.findOpponentCardObject(plan.attackerIndex);
        if (!attackerObj) return false;
        if (this.debugSync) console.log('[GameScene][debug] Oponente BOT ataque directo', { attackerIndex: plan.attackerIndex, timestamp: Date.now() });
        this.revealOpponentCard(attackerObj);
        this._registerCardAttack(attackerObj, 'opponent');
        this.opponent.fillEssence(attackerObj.getData('cardData').type);
        this.endOpponentTurn(true);
        return true;
    }

    /**
     * Ejecuta la colocación de una carta desde la mano del oponente.
     * @param {object} plan Plan { kind: 'playCard', handIndex, slotIndex }.
     * @returns {boolean} true si la carta se colocó.
     */
    executeBotPlayCard(plan) {
        const cardToPlay = this.opponent.hand[plan.handIndex];
        const slotIndex = plan.slotIndex;
        if (!cardToPlay || !this.opponent.field.isEmpty(slotIndex)) return false;
        if (this.debugSync) console.log('[GameScene][debug] Oponente BOT jugando carta', { cardInstanceId: cardToPlay.instanceId, slotIndex, timestamp: Date.now() });
        const played = this.opponent.playCardFromHand(cardToPlay.instanceId, slotIndex);
        if (!played) return false;
        const slotObj = this['opponent_battle_slots'][slotIndex];
        this.createFieldCard(slotObj, played, { isOpponent: true, revealed: false, fieldIndex: slotIndex });
        this.opponent.drawCard();
        this.refreshOpponentHand();
        this.updateDeckCounts();
        this.endOpponentTurn(true);
        return true;
    }

    /**
     * Revela una carta del jugador. Aunque visualmente ya lo está,
     * esta función asegura que el flag 'isRevealed' esté activo para la IA.
     * @param {Card} cardObject La carta del jugador a revelar.
     */
    revealPlayerCard(cardObject) {
        if (!cardObject || cardObject.getData('isRevealed')) {
            return;
        }
        const cardData = cardObject.getData('cardData') || cardObject.cardData;
        console.log('[GameScene] Carta del jugador revelada', { cardId: cardData && cardData.id, type: cardData && cardData.type, level: cardData && cardData.level, cause: 'ataque/fusión' });
        cardObject.setData('isRevealed', true);
        // Si el objeto muestra textura de back, cambiar por la frontal
        if (cardObject.setTexture && cardData) {
            const textureName = `card-${cardData.type}-${cardData.level}`;
            cardObject.setTexture(textureName);
            // Asegurar que la textura frontal pinta exactamente al tamaño del slot
            cardObject.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);
        }
    }


    /**
     * Inicia el turno del jugador, reseteando flags y activando el temporizador.
     */
    startPlayerTurn() {
        // Convergencia: si el jugador armó los 6 tipos y los conservó durante el
        // turno rival completo, gana. Si perdió alguno, se cancela y rearma.
        if (this.turn.playerConvergenceArmed) {
            if (ConvergenceService.isConverged(this.player.field.types(), GAME_CONFIG.UNIQUE_TYPES_TO_WIN)) {
                console.log('[GameScene] CONVERGENCIA: el jugador conservó los 6 tipos un turno completo.');
                this.endGame('player');
                return;
            }
            this.turn.playerConvergenceArmed = false;
            console.log('[GameScene] Convergencia del jugador cancelada: perdió un tipo durante el turno rival.');
            this.refreshConvergenceStatusUi();
        }

        this.turn.beginPlayerTurn();

        console.log('[GameScene] Inicio del turno del JUGADOR', { turnNumber: this.turn.playerTurnNumber, mustAttack: this.turn.playerMustAttackThisTurn });
        this.events.emit('update-turn-indicator', 'player');
        // Emitimos el estado del contador obligatorio para que la UI lo muestre
        this.events.emit('update-attack-counter', 'player', this.turn.playerTurnsSinceLastAttack + 1, this.turn.playerMustAttackThisTurn);

        // Procesar cooldowns de las cartas del jugador al inicio de su turno
        const playerFieldCardObjects = this.children.list.filter(c => c.getData('isCardOnField') && !c.getData('isOpponentCard'));
        playerFieldCardObjects.forEach(cardObj => {
            let cooldown = cardObj.getData('cooldown') || 0;
            if (cooldown > 0) {
                cooldown = Math.max(0, cooldown - 1);
                cardObj.setData('cooldown', cooldown);
            }
            // Resets de restricción por nivel (regla central en LevelAttackRule)
            this._refreshCardTurnMetadata(cardObj, 'player');
        });

        // --- TEMPORIZADOR REDUCIDO A 12s ---
        if (this.turnTimer) this.turnTimer.destroy();
        this.turnTimer = this.time.addEvent({
            delay: GAME_CONFIG.TURN_TIME_LIMIT_MS,
            callback: this._playerTimedOut,
            callbackScope: this
        });

        // Si está obligado a atacar y NO tiene cartas en campo: saltar el turno y reiniciar contador.
        const playerHasFieldCards = this.player.field.hasAny();
        if (this.turn.playerMustAttackThisTurn && !playerHasFieldCards) {
                console.log('[GameScene] Obligado a atacar pero no tiene cartas -> salto de turno automático', { playerTurnsSinceLastAttack: this.turn.playerTurnsSinceLastAttack });
            // El salto forzado no cuenta como inactividad ni como turno sin atacar.
            this.endPlayerTurn(true);
            return;
        }
    }

    // Nuevo helper cuando se queda sin tiempo
    _playerTimedOut() {
        console.log('[GameScene] Tiempo agotado: el jugador no actuó en el turno', { turnNumber: this.turn.playerTurnNumber });
        // Si estaba obligado a atacar y tenía cartas, se considera que NO atacó:
        // endPlayerTurn() aumentará su contador de turnos sin atacar (no lo reiniciamos).
        this.endPlayerTurn();
    }

    /**
     * Finaliza el turno del jugador, ya sea por tiempo o por acción voluntaria (eliminado).
     * @param {boolean} [forcedAttackSkip=false] Si el turno se salta por obligación de atacar sin cartas.
     */
    endPlayerTurn(forcedAttackSkip = false) {
        if (this.turn.state !== 'player-turn') return;
        // Si hay animaciones en curso, solo marcamos el cambio de turno como pendiente.
        if (!this.turn.requestTurnEnd('opponent')) return;

        console.log('[GameScene] Fin del turno del JUGADOR', { playerHasActed: this.turn.playerHasActed, performedAttack: this.turn.playerPerformedAttackThisTurn, turnNumber: this.turn.playerTurnNumber });

        if (this.turnTimer) this.turnTimer.destroy();
        // Comprobamos inactividad y actualizamos contadores de ataque
        const turnReport = forcedAttackSkip
            ? this.turn.finishForcedAttackSkip()
            : this.turn.finishPlayerTurn();
        if (!this.turn.playerHasActed) {
            console.log('[GameScene] Jugador inactivo', { inactiveTurns: turnReport.inactiveTurns });
        }
        // Notificamos el contador a la UI
        this.events.emit('update-attack-counter', 'player', this.turn.playerTurnsSinceLastAttack + 1, this.turn.playerMustAttackThisTurn);

        // Deseleccionamos cualquier carta
        this.deselectCard(false);

        // Comprobamos condiciones de victoria antes de pasar el turno
        const winner = this.checkVictoryConditions();
        if (winner) {
            this.endGame(winner);
            return;
        }

        // En modo LAN, notificar al servidor del fin de turno
        if (this.isLAN && this.socket) {
            this.lan.emitEndTurn();
        }
        
        // En modo local o bot, iniciar turno del oponente directamente
        if (!this.isLAN) {
            this.time.delayedCall(100, () => this.startOpponentTurn());
        }
        // En modo LAN, el evento 'turn_changed' del servidor iniciará el siguiente turno
    }

    /**
     * Finaliza el turno del oponente y devuelve el control al jugador, comprobando victoria.
     * @param {boolean} [opponentActed=false] - Si el oponente realizó alguna acción.
     */
    endOpponentTurn(opponentActed = false) {
        if (this.turn.state !== 'opponent-turn') return;

        // Comprobamos inactividad del oponente y actualizamos contadores de ataque
        const turnReport = this.turn.finishOpponentTurn(opponentActed);
        if (!opponentActed) {
            console.log('[GameScene] Oponente inactivo', { inactiveTurns: turnReport.inactiveTurns });
        }
        this.events.emit('update-attack-counter', 'opponent', this.turn.opponentTurnsSinceLastAttack + 1, this.turn.opponentMustAttackThisTurn);

        // Comprobamos condiciones de victoria
        const winner = this.checkVictoryConditions();
        if (winner) {
            this.endGame(winner);
            return;
        }

        // En modo LAN, el servidor gestiona los turnos (no llamamos startPlayerTurn aquí)
        // En modo bot, sí llamamos startPlayerTurn
        if (!this.isLAN) {
            this.time.delayedCall(100, () => this.startPlayerTurn());
        }
        // En modo LAN, esperamos el evento 'turn_changed' del servidor
    }

    /**
     * Se ejecuta en cada frame. Usado para actualizar el contador del temporizador.
     */
    update() {
        if (this.turn.state === 'player-turn' && this.turnTimer) {
            // Usamos getProgress() para tener un valor de 0 a 1 y lo multiplicamos por el total.
            // Math.ceil asegura que el último segundo se muestre como '1' en lugar de '0'.
            const totalSeconds = GAME_CONFIG.TURN_TIME_LIMIT_MS / 1000;
            const remainingTime = Math.ceil((1 - this.turnTimer.getProgress()) * totalSeconds);
            // Emitimos un evento para que la UI actualice el contador
            this.events.emit('update-timer', remainingTime);
        } else if (this.turn.state !== 'game-over') {
            // Si no es el turno del jugador, nos aseguramos que el timer esté en 0
            this.events.emit('update-timer', 0);
        }
    }

    /**
     * Gestiona el intento de ataque de una carta del jugador a una del oponente.
     * @param {Phaser.GameObjects.Image} attackingCardObject El objeto de la carta que ataca.
     * @param {Phaser.GameObjects.Image} defendingCardObject El objeto de la carta que defiende.
     */
    handleAttack(attackingCardObject, defendingCardObject) {
        if (this.turn.state !== 'player-turn') return;
        if (this.turn.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }

        // Restricción por nivel: comprobar blockedTurn en lugar de solo cooldown
        const blocked = attackingCardObject.getData('blockedTurn');
        if (blocked === this.turn.playerTurnNumber) {
            console.log('[GameScene] Esta carta está descansando este turno (restricción por nivel).');
            return;
        }

        // Unificamos el acceso a los datos de las cartas.
        const attackerData = attackingCardObject.getData('cardData');
        const defenderData = defendingCardObject.getData('cardData');

        this.turn.playerHasActed = true; // Consume la acción del jugador
        this.turn.playerPerformedAttackThisTurn = true;
        this.turn.playerTurnsSinceLastAttack = 0; // Reiniciamos contador de ataques

        console.log('[GameScene] Jugador realiza ataque', { attackerType: attackerData.type, defenderType: defenderData.type, attackerIndex: attackingCardObject.getData('fieldIndex'), defenderIndex: defendingCardObject.getData('fieldIndex') });

        // Revelamos ambos según regla 14
        this.revealPlayerCard(attackingCardObject);
        this.revealOpponentCard(defendingCardObject);

        // Resolvemos el combate
        let result = resolveCombat(attackerData, defenderData);
        // Poder FUEGO (Ráfaga): el próximo ataque del jugador también gana en empate.
        if (this.turn.playerNextAttackBreaksTie) {
            if (result.winner === 'none') {
                console.log('[GameScene] Ráfaga: el empate se convierte en victoria.');
                result = { winner: 'attacker', loser: 'defender' };
            }
            this.turn.playerNextAttackBreaksTie = false;
        }
        console.log('[GameScene] Resultado del combate', result);

        // Registrar cooldowns / consecutiveAttacks
        this._registerCardAttack(attackingCardObject, 'player');

        // Emitir evento de ataque si estamos en LAN
        if (this.isLAN && this.socket) {
            this.lan.emitGameEvent({
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
     * @param {Phaser.GameObjects.Image} attackingCardObject La carta que ataca.
     */
    handleDirectAttack(attackingCardObject) {
        if (this.turn.state !== 'player-turn') return;
        if (this.turn.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }

        const blocked = attackingCardObject.getData('blockedTurn');
        if (blocked === this.turn.playerTurnNumber) {
            console.log('[GameScene] Esta carta está descansando este turno (restricción por nivel).');
            return;
        }

        const attackerData = attackingCardObject.cardData || attackingCardObject.getData('cardData');
        this.turn.playerHasActed = true;
        this.turn.playerPerformedAttackThisTurn = true;
        this.turn.playerTurnsSinceLastAttack = 0;
        // Un ataque directo siempre gana: no aplica la Ráfaga (se consume igualmente).
        this.turn.playerNextAttackBreaksTie = false;

        console.log('[GameScene] Jugador realiza ataque directo', { attackerType: attackerData.type, attackerIndex: attackingCardObject.getData('fieldIndex') });

        // Llenamos la esencia del jugador
        this.player.fillEssence(attackerData.type);

        // Marcar la carta como revelada (ataca)
        this.revealPlayerCard(attackingCardObject);

        // Registrar cooldown / consecutive attacks
        this._registerCardAttack(attackingCardObject, 'player');

        // Emitir evento de ataque directo si estamos en LAN
        if (this.isLAN && this.socket) {
            this.lan.emitGameEvent({
                type: 'direct_attack',
                attackerIndex: attackingCardObject.getData('fieldIndex'),
                essenceType: attackerData.type
            });
        }

        // Animamos el ataque (hacia el centro)
        const targetPos = { x: this.scale.width / 2, y: this['opponent_battle_slots'][0].y };
        this.animateAttack(attackingCardObject, targetPos, { winner: 'attacker', loser: 'none' });
    }

    animateAttack(attackingCardObject, target, result) {
        this.turn.onBlockingAnimationStarted();
        console.log('[GameScene] Animación de ataque iniciada. Bloqueos activos:', this.turn.blockingAnimations);

        // Evitar el "lift" de selección en curso.
        this.tweens.killTweensOf(attackingCardObject);

        const targetX = target.x;
        const targetY = target.y;
        const startX = attackingCardObject.x;
        const startY = attackingCardObject.y;
        const baseScale = attackingCardObject.scale;
        const defenderCard = (target && typeof target.getData === 'function') ? target : null;

        // Fase 1 — lanzamiento: el atacante se estira y vuela al objetivo.
        this.tweens.add({
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
                const impactColor = defenderData ? (TYPE_COLORS[defenderData.type] || 0xffffff) : 0xffffff;
                this.cameras.main.shake(70, 0.004);
                playImpactFx(this, targetX, targetY, impactColor);

                if (defenderCard && defenderCard.active) {
                    const defenderIsOpponent = !!defenderCard.getData('isOpponentCard');
                    const direction = defenderIsOpponent ? -1 : 1;
                    this.tweens.add({
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
                    this.deselectCard(false);
                    const attackerIdx = attackingCardObject.active ? attackingCardObject.getData('fieldIndex') : null;
                    console.log('[GameScene] animateAttack local complete, result:', result, { attackerFieldIndex: attackerIdx, target });
                    // Determinar owner del atacante según metadata visual
                    const attackerIsOpponent = !!attackingCardObject.getData('isOpponentCard');
                    const attackerOwner = attackerIsOpponent ? this.opponent : this.player;
                    // Si el target es un objeto visual de carta, determinar su owner
                    let defenderOwner = null;
                    let defenderFieldIndex = null;
                    if (defenderCard && defenderCard.active) {
                        const defenderIsOpponent = !!defenderCard.getData('isOpponentCard');
                        defenderOwner = defenderIsOpponent ? this.opponent : this.player;
                        defenderFieldIndex = defenderCard.getData('fieldIndex');
                    }

                    if (result.loser === 'attacker') {
                        console.log('[GameScene] animateAttack: destruyendo atacante', { owner: attackerOwner.id, idx: attackerIdx });
                        if (attackerIdx !== null) this.destroyCard(attackerOwner, attackerIdx);
                    } else if (result.loser === 'defender' && defenderOwner && typeof defenderFieldIndex === 'number') {
                        console.log('[GameScene] animateAttack: destruyendo defensor', { owner: defenderOwner.id, idx: defenderFieldIndex });
                        this.destroyCard(defenderOwner, defenderFieldIndex);
                        // Regla de esencias: el atacante gana el combate y llena la esencia de su tipo.
                        const winnerData = attackingCardObject.getData('cardData') || attackingCardObject.cardData;
                        if (winnerData && winnerData.type) attackerOwner.fillEssence(winnerData.type);
                    }

                    // Tras el ataque, el turno del jugador termina automáticamente
                    this.endPlayerTurn();
                    this._animationComplete();
                };

                this.tweens.add({
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
                this.time.delayedCall(1000, finalizeAttack);
            }
        });
    }

    /**
     * Comprueba todas las condiciones de victoria al final de un turno.
     * @returns {string|null} 'player', 'opponent' o null.
     */
    checkVictoryConditions() {
        // La victoria por 6 tipos ya no es instantánea: se arma la Convergencia
        // aquí y se resuelve al comenzar el siguiente turno propio de cada bando.
        this._syncConvergence();
        const result = VictoryEvaluator.evaluate({ player: this.player, opponent: this.opponent, turn: this.turn, config: GAME_CONFIG });
        if (result.log) console.log(result.log);
        return result.winner;
    }

    /**
     * Sincroniza el flag de Convergencia de ambos jugadores según los tipos
     * únicos que tienen en el campo. Al completar los 6 se arma; si pierde
     * algún tipo, se cancela. Responsabilidad: mantener el estado del turno
     * coherente con el tablero modelado por Player.
     */
    _syncConvergence() {
        this.turn.playerConvergenceArmed = ConvergenceService.isConverged(
            this.player.field.types(),
            GAME_CONFIG.UNIQUE_TYPES_TO_WIN
        );
        this.turn.opponentConvergenceArmed = ConvergenceService.isConverged(
            this.opponent.field.types(),
            GAME_CONFIG.UNIQUE_TYPES_TO_WIN
        );
        this.refreshConvergenceStatusUi();
    }

    /**
     * Emite a la UIScene el estado de Convergencia para avisos visuales.
     */
    refreshConvergenceStatusUi() {
        this.events.emit('convergence-status', {
            player: this.turn.playerConvergenceArmed,
            opponent: this.turn.opponentConvergenceArmed
        });
    }

    /**
     * Ejecuta el poder de esencia solicitado por la UIScene (clic en un orbe
     * propio activo). Validación delegada en EssencePowerService; los efectos
     * se aplican sobre el dominio (Player, TurnManager). Uso: 1 por turno propio.
     * @param {string} essenceType Tipo de esencia ('fuego', 'agua', ...).
     */
    useEssencePower(essenceType) {
        if (this.turn.state !== 'player-turn') {
            console.log('[GameScene] Solo puedes usar poderes de esencia en tu turno.');
            return;
        }

        const plan = EssencePowerService.plan(essenceType, {
            isPlayerTurn: this.turn.state === 'player-turn',
            usedThisTurn: this.turn.playerEssencePowerUsed,
            essenceActive: this.player.essences.has(essenceType),
            graveyard: this.player.graveyard,
            opponentHand: this.opponent.hand
        });
        if (!plan.ok) {
            console.warn('[GameScene] Poder de esencia no disponible:', { essenceType, reason: plan.reason });
            return;
        }

        this.turn.playerEssencePowerUsed = true;

        switch (essenceType) {
            case CARD_TYPES.FUEGO:
                // Ráfaga: el próximo ataque del jugador también gana en empate.
                this.turn.playerNextAttackBreaksTie = true;
                break;
            case CARD_TYPES.AGUA: {
                // Rescate: vuelve a la mano la carta base más reciente del cementerio.
                const rescued = this.player.returnTopGraveyardCardToHand();
                if (rescued) this.refreshPlayerHand();
                break;
            }
            case CARD_TYPES.PLANTA:
                // Brotar: roba 2 cartas.
                this.player.drawCard();
                this.player.drawCard();
                this.refreshPlayerHand();
                this.updateDeckCounts();
                break;
            case CARD_TYPES.LUZ:
                // Clarividencia: revela la mano del rival hasta que robe o juegue.
                this.revealOpponentHandForTurn();
                break;
            case CARD_TYPES.SOMBRA: {
                // Robar: el rival descarta su carta de mayor nivel.
                const discarded = this.opponent.discardHighestLevelCard();
                if (discarded) {
                    this.refreshOpponentHand();
                    this.updateDeckCounts();
                }
                break;
            }
            case CARD_TYPES.ESPIRITU:
                // Conducto: bloquea la Convergencia del rival durante su próximo turno.
                this.turn.opponentConvergenceBlocked = true;
                this.refreshConvergenceStatusUi();
                break;
            default:
                console.warn('[GameScene] Poder de esencia desconocido:', essenceType);
                this.turn.playerEssencePowerUsed = false;
                return;
        }

        // Feedback para la UIScene (toast + highlight del orbe).
        this.events.emit('essence-power-used', essenceType, plan.name);
        console.log('[GameScene] Poder de esencia usado:', plan.name, 'de', essenceType);
    }

    /**
     * Poder LUZ (Clarividencia): revela visualmente la mano del rival. Las cartas
     * vuelven a su reverso la próxima vez que el rival robe o juegue (refresh).
     */
    revealOpponentHandForTurn() {
        const opponentCards = this['opponent-cards'] || [];
        let revealed = 0;
        opponentCards.forEach(cardObj => {
            const cd = (cardObj.getData && cardObj.getData('cardData')) || cardObj.cardData;
            if (!cd) return;
            try { cardObj.setTexture(`card-${cd.type}-${cd.level}`); } catch (e) {}
            cardObj.setData('isRevealed', true);
            revealed++;
        });
        console.log(`[GameScene] Clarividencia: mano del rival revelada (${revealed} carta(s)).`);
    }

    /**
     * Finaliza la partida y muestra un mensaje de victoria/derrota.
     * @param {string} winner El ganador de la partida ('player' u 'opponent').
     */
    endGame(winner) {
        this.turn.state = 'game-over';
        if (this.turnTimer) this.turnTimer.destroy();
        this.events.emit('update-timer', 0); // Limpia el contador en la UI
        // No hay botón de terminar turno ahora.

        console.log('[GameScene] Fin de la partida. Ganador:', winner);

        // Progreso real: cada victoria/derrota se cuenta y alimenta misiones y logros.
        const username = (this.playerData && this.playerData.username) || 'Jugador';
        if (winner === 'player') {
            recordVictory(username);
            const fieldCards = this.player.field.cards();
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
        if (winner === 'player') playSfx('victory', this);
        else if (winner === 'opponent') playSfx('defeat', this);

        // Desactivamos toda la interactividad para que no se pueda seguir jugando.
        this.input.enabled = false;

        // Emitimos un evento para que la UIScene muestre la pantalla de fin de juego.
        this.events.emit('game-over', winner);
    }

    /**
     * Destruye una carta del campo de forma robusta.
     * Acepta instanceId opcional para desambiguar si el modelo y la vista se desincronizan.
     */
    destroyCard(owner, fieldIndex, instanceId = null) {
        if (this.debugSync) console.log('[GameScene][debug] destroyCard called', { owner: owner && owner.id, fieldIndex, instanceId, timestamp: Date.now() });
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
            cardObject = this.children.list.find(child => {
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
            if (!this._pendingDestroys) this._pendingDestroys = new Set();
            if (this._pendingDestroys.has(finalInstanceId)) {
                console.log('[GameScene] destroyCard: ya en proceso de destrucción, se ignora petición duplicada', { instanceId: finalInstanceId });
                return;
            }
        }

        // Si no encontramos por instanceId, buscar por índice/propiedad owner
        if (!cardObject && typeof fieldIndex === 'number') {
            const isOpponentCard = owner.id === 'opponent';
            cardObject = this.children.list.find(child => {
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
            const fallback = this.children.list.find(child => {
                try { return child.getData && child.getData('fieldIndex') === fieldIndex; } catch (e) { return false; }
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
            if (owner.id === 'player') this.refreshPlayerHand();
            this.updateDeckCounts();

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
                        const corrected = this.children.list.find(child => {
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
                            const flippedOwner = owner.id === 'player' ? this.opponent : this.player;
                            const flippedObj = this.children.list.find(child => child.getData && child.getData('fieldIndex') === fieldIndex && ((flippedOwner.id === 'player' && !child.getData('isOpponentCard')) || (flippedOwner.id === 'opponent' && child.getData('isOpponentCard'))));
                            if (flippedObj) {
                                console.log('[GameScene] destroyCard: encontrado objeto en flipped owner, corrigiendo owner.', { flippedOwner: flippedOwner.id, foundName: flippedObj.name });
                                owner = flippedOwner;
                                cardObject = flippedObj;
                            }
                        }
                    }
                }
            } catch (e) { /* ignore metadata check errors */ }

            this.turn.onBlockingAnimationStarted();
            console.log('[GameScene] Animación de destrucción iniciada. Bloqueos activos:', this.turn.blockingAnimations);
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
                this._animationComplete();
                tryFinalize();
            };

            playDeathFx(this, cardObject, fxCardData, finishDeath);

            // Red de seguridad: la animación dura 340 ms; 650 ms lo cubre con margen.
            this.time.delayedCall(650, finishDeath);
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
            const slot = this['player_battle_slots'][fieldIndex];
            if (slot) {
                // Asegurarnos de restaurar como dropZone para permitir jugar cartas en él
                try { slot.setInteractive({ dropZone: true }); } catch (e) { slot.setInteractive(); }
            }
            this.refreshPlayerHand();
        }

        this.updateDeckCounts();
    }

    // Decoración visual del campo de batalla (solo presentación, sin lógica).
    // Capa futbolística: tablero de piedra oscura con viñeta, energía naranja
    // (oponente) / azul (jugador), emblema central dorado, marcos ornamentales
    // y runas de cristal. Todo se agrupa en this.fieldDecor (rendered bajo las cartas).
    createFieldDecor() {
        const W = this.scale.width;
        const H = this.scale.height;
        const CX = W / 2;
        const CY = H / 2;
        const GOLD = 0xcfaf6d;
        const GOLD_BRIGHT = 0xe8cf8f;
        const ORANGE = 0xff9a5c;
        const BLUE = 0x5bc0ff;

        const container = this.add.container(0, 0).setDepth(-0.4);
        this.fieldDecor = container;

        const diamondPts = (x, y, r) => [
            new Phaser.Geom.Point(x, y - r),
            new Phaser.Geom.Point(x + r, y),
            new Phaser.Geom.Point(x, y + r),
            new Phaser.Geom.Point(x - r, y)
        ];

        // Viñeta oscura suave para mejorar la legibilidad sobre el video.
        container.add(this.add.rectangle(CX, CY, W, H, 0x04060f, 0.14));

        // ---- Franjas de energía ----
        const beam = (y, color) => {
            const g = this.add.graphics();
            g.fillStyle(color, 0.04).fillRect(0, y - 62, W, 124);
            g.fillStyle(color, 0.07).fillRect(0, y - 30, W, 60);
            g.lineStyle(2, color, 0.30).lineBetween(0, y, W, y);
            g.lineStyle(2, color, 0.14).lineBetween(0, y - 24, W, y - 24);
            g.lineStyle(2, color, 0.14).lineBetween(0, y + 24, W, y + 24);
            return g;
        };
        const opponentFieldY = H * 0.45 - 70;
        const playerFieldY = H * 0.55 + 70;
        container.add(beam(opponentFieldY, ORANGE));
        container.add(beam(playerFieldY, BLUE));

        // ---- Emblema central dorado ----
        const emblem = this.add.graphics();
        emblem.lineStyle(2, GOLD, 0.26).strokeCircle(CX, CY, 118);
        emblem.lineStyle(2, GOLD, 0.38).strokeCircle(CX, CY, 86);
        emblem.save().translateCanvas(CX, CY).rotateCanvas(Math.PI / 4);
        emblem.lineStyle(2, GOLD, 0.40).strokeRect(-70, -70, 140, 140);
        emblem.lineStyle(3, GOLD_BRIGHT, 0.60).strokeRect(-44, -44, 88, 88);
        emblem.fillStyle(GOLD, 0.10).fillRect(-44, -44, 88, 88);
        emblem.restore();
        for (let a = 0; a < 8; a++) {
            const ang = a * Math.PI / 4;
            emblem.lineStyle(2, GOLD, 0.24)
                .lineBetween(CX + Math.cos(ang) * 88, CY + Math.sin(ang) * 88,
                             CX + Math.cos(ang) * 100, CY + Math.sin(ang) * 100);
        }
        emblem.fillStyle(GOLD, 0.12).fillCircle(CX, CY, 30);
        emblem.fillStyle(GOLD_BRIGHT, 0.9).fillCircle(CX, CY, 5);
        container.add(emblem);

        // ---- Marcos dorados alrededor de las filas de batalla ----
        const frameRow = (yCenter) => {
            const positions = calculateRowPositions({ numItems: 6, itemWidth: 110, itemSpacing: 35, containerWidth: W });
            const left = Math.min(...positions) - 82;
            const right = Math.max(...positions) + 82;
            const top = yCenter - 78;
            const height = 156;
            const g = this.add.graphics();
            g.lineStyle(2, GOLD, 0.28).strokeRoundedRect(left, top, right - left, height, 20);
            g.lineStyle(1, GOLD, 0.14).strokeRoundedRect(left + 9, top + 9, right - left - 18, height - 18, 16);
            const corners = [[left, top], [right, top], [left, top + height], [right, top + height]];
            corners.forEach(([x, y]) => {
                g.fillStyle(GOLD_BRIGHT, 0.75);
                g.fillPoints(diamondPts(x, y, 6), true);
            });
            return g;
        };
        container.add(frameRow(opponentFieldY));
        container.add(frameRow(playerFieldY));

        // ---- Runas de cristal en los laterales de cada fila de batalla ----
        const rune = (x, y, color, r = 7) => {
            const g = this.add.graphics();
            g.fillStyle(color, 0.10).fillCircle(x, y, r * 3);
            g.fillStyle(color, 0.18).fillCircle(x, y, r * 2);
            g.fillStyle(color, 0.85);
            g.fillPoints(diamondPts(x, y, r), true);
            return g;
        };

        const battlePositions = calculateRowPositions({ numItems: 6, itemWidth: 110, itemSpacing: 35, containerWidth: W });
        const leftEdge = Math.min(...battlePositions) - 82;
        const rightEdge = Math.max(...battlePositions) + 82;

        container.add(rune(leftEdge + 16, opponentFieldY, ORANGE));
        container.add(rune(rightEdge - 16, opponentFieldY, ORANGE));
        container.add(rune(leftEdge + 16, playerFieldY, BLUE));
        container.add(rune(rightEdge - 16, playerFieldY, BLUE));

        // ---- Brillo y runa junto a los mazos ----
        const deckGlow = (x, y, color) => {
            const g = this.add.graphics();
            g.fillStyle(color, 0.05).fillCircle(x, y, 88);
            g.fillStyle(color, 0.08).fillCircle(x, y, 56);
            g.fillStyle(color, 0.14).fillCircle(x, y, 32);
            g.lineStyle(2, GOLD, 0.24).strokeCircle(x, y, 46);
            return g;
        };
        container.add(deckGlow(120, 290, ORANGE));
        container.add(deckGlow(W - 120, H - 290, BLUE));
        container.add(rune(120, 246, GOLD_BRIGHT));
        container.add(rune(W - 120, H - 334, GOLD_BRIGHT));
    }

    // Crear fila de slots
    createSlotsRow(y, name, numSlots = 4) { // Por defecto crea 4 slots
        const slots = [];
        const slotWidth = 110; // Ancho reducido para 1280px
        const slotSpacing = 35; // Espacio reducido
        const positionsX = calculateRowPositions({
            numItems: numSlots,
            itemWidth: slotWidth,
            itemSpacing: slotSpacing,
            containerWidth: this.scale.width
        });

        for (let i = 0; i < numSlots; i++) {
            let slot = this.add.image(positionsX[i], y, 'slot')
                .setScale(0.25) // Escala reducida
                .setAlpha(0.6)
                .setName(`${name}-${i}`); // Asignamos un nombre único para identificarlo

            // Si es un slot del campo de batalla del jugador, lo hacemos una zona de drop
            if (name === 'player_battle_slots') {
                slot.setInteractive({ dropZone: true }); // CORRECCIÓN: Aseguramos que sea dropzone
                // Le añadimos un listener para cuando se haga clic en él
                slot.on('pointerdown', () => {
                    this.onSlotClicked(slot);
                });
            } else if (name === 'opponent_battle_slots') {
                // Hacemos que los slots del oponente sean interactivos para poder hacerles clic.
                slot.setInteractive().on('pointerdown', () => {
                    this.onOpponentSlotClicked(slot);
                });
            }

            slots.push(slot);
        }

        this[name] = slots;
    }

    // Crear fila de cartas
    createCardsRow(y, name, hand) {
        const cards = [];
        const numCards = hand.length;
        const cardWidth = 110; // Ancho reducido
        const cardSpacing = 35; // Espacio reducido
        const positionsX = calculateRowPositions({
            numItems: numCards,
            itemWidth: cardWidth,
            itemSpacing: cardSpacing, 
            containerWidth: this.scale.width
        });

        for (let i = 0; i < numCards; i++) {
            const cardData = hand[i];

            let card;
            if (name === 'player-cards') {
                card = this.createPlayerCard(positionsX[i], y, cardData);
            } else {
                card = this.createOpponentCard(positionsX[i], y, cardData);
            }

            cards.push(card);
        }

        this[name] = cards;
    }

    // Crear carta del jugador
    createPlayerCard(x, y, cardData) {
        const card = new Card(this, x, y, cardData, false); // Crear la carta en su posición final
        card.setDisplaySize(this.cardHandSize.width, this.cardHandSize.height); // Tamaño unificado
        card.setData('startPosition', { x, y });
        card.setData('isRevealed', false);
        card.setData('isCardOnField', false);
        card.on('pointerdown', () => this.onCardClicked(card));

        return card;
    }

    /**
     * Gestiona toda la lógica cuando se hace clic en una carta.
     * @param {Card} clickedCard El objeto de la carta que ha sido clicada.
     */
    onCardClicked(clickedCard) {
        // Evitar seleccionar cartas del oponente directamente.
        const clickedIsOpponent = !!clickedCard.getData('isOpponentCard');

        // Si se clicó una carta del oponente:
        if (clickedIsOpponent) {
            // Permitir solo que sea objetivo de un ataque si ya hay una carta propia
            // seleccionada en el campo.
            if (this.selectedCard && this.selectedCard.getData('isCardOnField') && !this.selectedCard.getData('isOpponentCard') && clickedCard.getData('isCardOnField')) {
                this.handleAttack(this.selectedCard, clickedCard);
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
     * @param {Phaser.GameObjects.Image} clickedSlot El slot que ha sido clicado.
     */
    onSlotClicked(clickedSlot) {
        // Solo hacemos algo si hay una carta seleccionada y no es una carta del campo
        if (this.selectedCard && !this.selectedCard.getData('isCardOnField')) {
            this.handlePlayCard(this.selectedCard, clickedSlot);
        } // Si no hay carta seleccionada, o la carta ya está en el campo, el clic en el tablero se encargará de deseleccionar.
        // Si hay una carta seleccionada y el oponente no tiene cartas, es un ataque directo.
        else if (this.selectedCard && this.selectedCard.getData('isCardOnField')) {
            const opponentFieldCards = this.opponent.field.cards();
            if (opponentFieldCards.length === 0) {
                this.handleDirectAttack(this.selectedCard);
            }
        }
    }

    /**
     * Gestiona el clic en un slot del campo de batalla del oponente.
     * @param {Phaser.GameObjects.Image} clickedSlot El slot que ha sido clicado.
     */
    onOpponentSlotClicked(clickedSlot) {
        // Si tenemos una carta de nuestro campo seleccionada...
        if (this.selectedCard && this.selectedCard.getData('isCardOnField')) {
            // Y el oponente no tiene cartas en el campo...
            const opponentHasCards = this.opponent.field.hasAny();
            if (!opponentHasCards) {
                this.handleDirectAttack(this.selectedCard);
            }
        }
    }

    /**
     * Marca una carta como seleccionada y ejecuta una animación.
     * @param {Card} cardObject La carta a seleccionar.
     */
    selectCard(cardObject) {
        this.selectedCard = cardObject;
        const fieldIndex = cardObject.getData('fieldIndex');
        console.log('Carta seleccionada:', { ...cardObject.cardData, fieldIndex: fieldIndex !== undefined ? fieldIndex : null });

        // La animación de "levantar" la carta ahora solo la mueve verticalmente.
        // No cambiaremos su tamaño para mantener la consistencia.
        const isOnField = !!cardObject.getData('isCardOnField');
        const yShift = isOnField ? -25 : -50; // Se levanta más si está en la mano
        this.tweens.add({
            targets: cardObject,
            y: cardObject.getData('startPosition').y + yShift,
            duration: 150,
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
        
        // Si se debe animar, la carta (esté en la mano o en el campo) vuelve
        // a su posición original guardada en 'startPosition'.
        if (animate) {
            this.tweens.add({
                targets: cardToDeselect,
                x: cardToDeselect.getData('startPosition').x,
                y: cardToDeselect.getData('startPosition').y,
                duration: 200,
                ease: 'Power1'
            });
        }
    }



    /**
     * Destruye las cartas actuales de la mano del jugador y las vuelve a crear.
     * Es útil para cuando la mano cambia (robar, descartar, etc.).
     */
    refreshPlayerHand() {
        // 1. Destruimos los objetos visuales de las cartas que quedaban en la mano
        if (this['player-cards']) {
            this['player-cards'].forEach(card => card.destroy());
        }

        // 2. Volvemos a crear la fila de cartas con los datos actualizados del modelo this.player.hand
        this.createCardsRow(this.scale.height * 0.83, 'player-cards', this.player.hand);
        console.log('Mano del jugador refrescada.');
    }

    /**
     * Destruye y vuelve a crear las cartas en la mano del oponente.
     * Útil para mantener la consistencia visual cuando roba una carta.
     */
    refreshOpponentHand() {
        // 1. Destruimos los objetos visuales existentes
        if (this['opponent-cards']) {
            this['opponent-cards'].forEach(card => card.destroy());
        }

        // 2. Volvemos a crear la fila con los datos actualizados
        this.createCardsRow(this.scale.height * 0.18, 'opponent-cards', this.opponent.hand);
    }

    // Crear carta del oponente
    createOpponentCard(x, y, cardData) {
        const card = new Card(this, x, y, cardData, true);
        // Normalizamos el tamaño visual del reverso a tamaño de mano (evita que backs nativos grandes se vean enormes)
        card.setDisplaySize(this.cardHandSize.width, this.cardHandSize.height); // Tamaño unificado
        card.setData('isOpponentCard', true);
        card.setData('isRevealed', false); // siempre boca abajo al colocarse en campo
        return card;
    }

    /**
     * Helper: crear una carta visual en un slot del campo y normalizar su visual.
     * @param {object} slotObj - El objeto slot con propiedades x,y
     * @param {object} cardData - Datos de la carta del modelo
     * @param {object} options - { isOpponent: bool, revealed: bool, fieldIndex: number }
     * @returns {Card} objeto visual creado
     */
    createFieldCard(slotObj, cardData, options = {}) {
        const { isOpponent = false, revealed = false, fieldIndex = null } = options;
        const cardObj = new Card(this, slotObj.x, slotObj.y, cardData, isOpponent);
        cardObj.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);
        if (isOpponent) cardObj.setData('isOpponentCard', true);
        // Aseguramos que la vista tenga la misma referencia de datos y metadata de instancia
        cardObj.setData('cardData', cardData);
        if (cardData && cardData.instanceId) {
            try { cardObj.setName(cardData.instanceId); } catch (e) {}
            try { cardObj.setData('instanceId', cardData.instanceId); } catch (e) {}
        }
        cardObj.setData('isCardOnField', true);
        if (fieldIndex !== null && typeof fieldIndex !== 'undefined') cardObj.setData('fieldIndex', fieldIndex);
        cardObj.setData('isRevealed', !!revealed);
        cardObj.setData('startPosition', { x: slotObj.x, y: slotObj.y });
        cardObj.on('pointerdown', () => this.onCardClicked(cardObj));
        return cardObj;
    }

    /**
     * Helper: crear una carta visual en coordenadas dadas (útil para fusiones que usan posiciones previas).
     */
    createFieldCardAt(x, y, cardData, options = {}) {
        const dummySlot = { x, y };
        return this.createFieldCard(dummySlot, cardData, options);
    }

    /**
     * Maneja eventos remotos que provienen del otro jugador via socket.
     * Soporta: play_card, fuse_cards, fuse_from_hand, attack, direct_attack
     */
    handleRemoteGameEvent(payload) {
        if (!payload || !payload.type) return;

        // Determinar si el actor del payload es el jugador remoto.
        // Si el emisor incluye `playerRole`, úsalo para comparar contra nuestro `this.playerRole`.
        let isRemotePlayer = false;
        if (payload.playerRole) {
            // Si el role enviado difiere del nuestro, el actor es remoto para este cliente.
            isRemotePlayer = payload.playerRole !== this.playerRole;
        } else {
            // Fallback histórico: actor === 'player' sigue interpretándose como acción del jugador remoto.
            isRemotePlayer = payload.actor === 'player';
        }

        // Si el emisor incluyó su playerRole y coincide con el nuestro, es nuestro propio evento (eco del servidor) -> ignorar.
        if (payload.playerRole && payload.playerRole === this.playerRole) {
            console.log('[GameScene] Ignorando evento propio eco del servidor:', payload.type, payload);
            return;
        }

        const targetModel = isRemotePlayer ? this.opponent : this.player;
        const targetSlotsName = isRemotePlayer ? 'opponent_battle_slots' : 'player_battle_slots';

        console.log('[GameScene] Evento remoto recibido', { type: payload.type, payload, isRemotePlayer, myRole: this.playerRole });
        
        // Marcar que el oponente ha actuado (solo si es su turno y es una acción del oponente remoto)
        const isOpponentAction = isRemotePlayer && this.turn.state === 'opponent-turn';
        
        switch (payload.type) {
            case 'play_card': {
                const card = payload.card;
                const fieldIndex = payload.fieldIndex;

                // Actualizar modelo
                try {
                    if (this.debugSync) console.log('[GameScene][debug] handling remote play_card', { cardInstanceId: card && card.instanceId, fieldIndex, targetBefore: targetModel.field.snapshot().map(f=>f&&f.instanceId), timestamp: Date.now() });
                    targetModel.field.set(fieldIndex, card);
                    if (this.debugSync) console.log('[GameScene][debug] model updated for remote play_card', { targetAfter: targetModel.field.snapshot().map(f=>f&&f.instanceId) });
                } catch (e) {
                    console.warn('No se pudo actualizar el modelo remoto:', e);
                }

                // Crear visual en el slot correspondiente usando helper central
                const slot = this[targetSlotsName] && this[targetSlotsName][fieldIndex];
                if (slot) {
                    // log si ya existía un objeto visual en ese slot
                    const existing = this.children.list.find(c => c.getData && c.getData('fieldIndex') === fieldIndex && c.getData('isCardOnField'));
                    if (this.debugSync) console.log('[GameScene][debug] slot visual before remote play', { existing: existing && ((existing.getData('cardData') && existing.getData('cardData').instanceId) || existing.getData('instanceId')), slotIndex: fieldIndex });
                    const oppCard = this.createFieldCard(slot, card, { isOpponent: isRemotePlayer, revealed: false, fieldIndex });
                    console.log('[GameScene] Carta colocada por remoto', { actor: payload.actor || (isRemotePlayer ? 'opponent' : 'player'), playerRole: payload.playerRole || null, cardId: card.id, instanceId: card.instanceId, type: card.type, level: card.level, fieldIndex });
                    if (this.debugSync) console.log('[GameScene][debug] slot visual after remote play', { created: oppCard && oppCard.getData && oppCard.getData('instanceId'), slotIndex: fieldIndex, timestamp: Date.now() });
                }
                
                // En LAN, marcar que el oponente actuó
                if (isOpponentAction) {
                    this.turn.opponentHasActed = true;
                }
                break;
            }
            
            case 'fuse_cards': {
                const sourceIndex = payload.sourceIndex;
                const targetIndex = payload.targetIndex;
                const resultCard = payload.resultCard;
                
                // Actualizar modelo
                if (this.debugSync) console.log('[GameScene][debug] handling remote fuse_cards', { sourceIndex, targetIndex, resultCardInstanceId: resultCard && resultCard.instanceId, targetBefore: targetModel.field.snapshot().map(f=>f&&f.instanceId), timestamp: Date.now() });
                targetModel.field.clearAt(sourceIndex);
                targetModel.field.set(targetIndex, resultCard);
                if (this.debugSync) console.log('[GameScene][debug] model updated for remote fuse_cards', { targetAfter: targetModel.field.snapshot().map(f=>f&&f.instanceId) });
                
                // Destruir objetos visuales en ambos índices
                const cardObjs = this.children.list.filter(c => 
                    c.getData('isOpponentCard') && 
                    c.getData('isCardOnField') &&
                    (c.getData('fieldIndex') === sourceIndex || c.getData('fieldIndex') === targetIndex)
                );
                cardObjs.forEach(obj => obj.destroy());
                
                // Crear carta fusionada
                const slot = this[targetSlotsName][targetIndex];
                if (slot) {
                    // log si ya existía un objeto visual en ese slot
                    const existing = this.children.list.find(c => c.getData && c.getData('fieldIndex') === targetIndex && c.getData('isCardOnField'));
                    if (this.debugSync) console.log('[GameScene][debug] slot visual before remote fuse_cards', { existing: existing && ((existing.getData('cardData') && existing.getData('cardData').instanceId) || existing.getData('instanceId')), slotIndex: targetIndex });
                    const fusedObj = this.createFieldCard(slot, resultCard, { isOpponent: true, revealed: true, fieldIndex: targetIndex });
                    try { fusedObj.setTexture(`card-${resultCard.type}-${resultCard.level}`); } catch (e) {}
                    console.log('[GameScene] Fusión remota en campo', { sourceIndex, targetIndex, resultCard });
                    if (this.debugSync) console.log('[GameScene][debug] slot visual after remote fuse_cards', { created: fusedObj && fusedObj.getData && fusedObj.getData('instanceId'), slotIndex: targetIndex, timestamp: Date.now() });
                }
                
                // En LAN, marcar que el oponente actuó
                if (isOpponentAction) {
                    this.turn.opponentHasActed = true;
                }
                break;
            }
            
            case 'fuse_from_hand': {
                const targetIndex = payload.targetIndex;
                const resultCard = payload.resultCard;
                
                // Actualizar modelo
                if (this.debugSync) console.log('[GameScene][debug] handling remote fuse_from_hand', { targetIndex, resultCardInstanceId: resultCard && resultCard.instanceId, targetBefore: targetModel.field.snapshot().map(f=>f&&f.instanceId), timestamp: Date.now() });
                targetModel.field.set(targetIndex, resultCard);
                if (this.debugSync) console.log('[GameScene][debug] model updated for remote fuse_from_hand', { targetAfter: targetModel.field.snapshot().map(f=>f&&f.instanceId) });
                
                // Destruir carta anterior en targetIndex
                const oldCard = this.children.list.find(c => 
                    c.getData('isOpponentCard') && 
                    c.getData('isCardOnField') &&
                    c.getData('fieldIndex') === targetIndex
                );
                if (oldCard) oldCard.destroy();
                
                // Crear carta fusionada
                const slot = this[targetSlotsName][targetIndex];
                if (slot) {
                    // log si ya existía un objeto visual en ese slot
                    const existing = this.children.list.find(c => c.getData && c.getData('fieldIndex') === targetIndex && c.getData('isCardOnField'));
                    if (this.debugSync) console.log('[GameScene][debug] slot visual before remote fuse_from_hand', { existing: existing && ((existing.getData('cardData') && existing.getData('cardData').instanceId) || existing.getData('instanceId')), slotIndex: targetIndex });
                    const fusedObj = this.createFieldCard(slot, resultCard, { isOpponent: true, revealed: true, fieldIndex: targetIndex });
                    try { fusedObj.setTexture(`card-${resultCard.type}-${resultCard.level}`); } catch (e) {}
                    console.log('[GameScene] Fusión remota desde mano', { targetIndex, resultCard });
                    if (this.debugSync) console.log('[GameScene][debug] slot visual after remote fuse_from_hand', { created: fusedObj && fusedObj.getData && fusedObj.getData('instanceId'), slotIndex: targetIndex, timestamp: Date.now() });
                }
                
                // Actualizar mano del oponente
                this.refreshOpponentHand();
                
                // En LAN, marcar que el oponente actuó
                if (isOpponentAction) {
                    this.turn.opponentHasActed = true;
                }
                break;
            }
            
            case 'attack': {
                const attackerIndex = payload.attackerIndex;
                const defenderIndex = payload.defenderIndex;
                const result = payload.result;
                
                if (this.debugSync) console.log('[GameScene][debug] handling remote attack', { attackerIndex, defenderIndex, result, timestamp: Date.now() });
                const attackerObj = this.children.list.find(c => 
                    c.getData('isOpponentCard') && 
                    c.getData('isCardOnField') &&
                    c.getData('fieldIndex') === attackerIndex
                );
                const defenderObj = this.children.list.find(c => 
                    !c.getData('isOpponentCard') && 
                    c.getData('isCardOnField') &&
                    c.getData('fieldIndex') === defenderIndex
                );
                
                if (!attackerObj || !defenderObj) {
                    console.warn('No se encontraron las cartas para el ataque remoto', { attackerIndex, defenderIndex, isRemotePlayer });
                    break;
                }
                
                // Revelar atacante/defensor (mapeo local ya aplicado: attackerObj es la carta del actor remoto)
                this.revealOpponentCard(attackerObj);
                this.revealPlayerCard(defenderObj);

                // En LAN, marcar que el oponente actuó y realizó ataque INMEDIATAMENTE
                if (isOpponentAction) {
                    this.turn.opponentHasActed = true;
                    this.turn.opponentPerformedAttackThisTurn = true;
                }

                console.log('[GameScene] Ataque remoto - animando', { attackerIndex, defenderIndex, result, isRemotePlayer });

                // Animar ataque y aplicar resultado. Determinar owner real desde objetos visuales
                this.tweens.add({
                    targets: attackerObj,
                    x: defenderObj.x,
                    y: defenderObj.y,
                    duration: 200,
                    yoyo: true,
                    ease: 'Power1',
                    onComplete: () => {
                        console.log('[GameScene] Ataque remoto complete, aplicando resultado:', result);
                        // Determinar owner y fieldIndex reales según los objetos encontrados
                        if (result.loser === 'attacker') {
                            const ownerIsOpponent = !!attackerObj.getData('isOpponentCard');
                            const owner = ownerIsOpponent ? this.opponent : this.player;
                            const idx = attackerObj.getData('fieldIndex');
                            console.log('[GameScene] Resultado indica atacante perdió; destruyendo objeto encontrado', { owner: owner.id, idx, ownerIsOpponent });
                            this.destroyCard(owner, idx);
                        } else if (result.loser === 'defender') {
                            const ownerIsOpponent = !!defenderObj.getData('isOpponentCard');
                            const owner = ownerIsOpponent ? this.opponent : this.player;
                            const idx = defenderObj.getData('fieldIndex');
                            console.log('[GameScene] Resultado indica defensor perdió; destruyendo objeto encontrado', { owner: owner.id, idx, ownerIsOpponent });
                            this.destroyCard(owner, idx);
                            // Regla de esencias: el atacante remoto (oponente) gana y llena la esencia de su tipo.
                            const winnerData = attackerObj.getData('cardData') || attackerObj.cardData;
                            if (winnerData && winnerData.type) this.opponent.fillEssence(winnerData.type);
                        }
                    }
                });
                break;
            }
            
            case 'direct_attack': {
                const attackerIndex = payload.attackerIndex;
                const essenceType = payload.essenceType;
                
                // Encontrar atacante
                const attackerObj = this.children.list.find(c => 
                    c.getData('isOpponentCard') && 
                    c.getData('isCardOnField') &&
                    c.getData('fieldIndex') === attackerIndex
                );
                
                if (attackerObj) {
                    this.revealOpponentCard(attackerObj);
                    
                    // Llenar esencia del oponente
                    this.opponent.fillEssence(essenceType);
                    
                    // Animar ataque directo
                    const targetPos = { x: this.scale.width / 2, y: this['player_battle_slots'][0].y };
                    this.tweens.add({
                        targets: attackerObj,
                        x: targetPos.x,
                        y: targetPos.y,
                        duration: 200,
                        yoyo: true,
                        ease: 'Power1',
                        onComplete: () => {
                            // En LAN, marcar que el oponente actuó y realizó ataque
                            if (isOpponentAction) {
                                this.turn.opponentHasActed = true;
                                this.turn.opponentPerformedAttackThisTurn = true;
                            }
                        }
                    });
                }
                break;
            }
            
            default:
                console.log('Evento remoto no manejado:', payload.type);
        }
    }

    /**
     * Revela una carta del oponente, cambiando su textura y aplicando una animación.
     * @param {Phaser.GameObjects.Image} cardObject La carta del oponente a revelar.
     */
    revealOpponentCard(cardObject) {
        // Si la carta no existe o ya fue revelada, no hacemos nada.
        if (!cardObject || cardObject.getData('isRevealed')) {
            return;
        }

        const cardData = cardObject.getData('cardData');
        const textureName = `card-${cardData.type}-${cardData.level}`;

        console.log('[GameScene] Revelando carta del oponente', { cardId: cardData.id, type: cardData.type, level: cardData.level });

        // Marcamos la carta como revelada para no volver a hacerlo.
        cardObject.setData('isRevealed', true);

        // Animación de revelación: un rápido encogimiento y expansión para simular un "giro".
        this.tweens.add({
            targets: cardObject,
            scaleX: 0, // Encogemos en el eje X hasta 0
            scaleY: cardObject.scaleY * 1.1, // La hacemos un poco más alta para el efecto
            duration: 100,
            ease: 'Power1',
            onComplete: () => {
                cardObject.setTexture(textureName); // Cambiamos la textura justo a la mitad de la animación

                // --- ¡CORRECCIÓN CLAVE! ---
                // Primero, forzamos el tamaño visual correcto con la nueva textura.
                // Esto recalcula internamente las escalas necesarias.
                cardObject.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);

                // Luego, animamos la expansión de vuelta a su escala correcta (la que calculó setDisplaySize).
                // En lugar de animar a '1', animamos al valor de escala que ya tiene el objeto.
                this.tweens.add({
                    targets: cardObject,
                    scaleX: cardObject.scaleX, // Restauramos la escala X correcta
                    scaleY: cardObject.scaleY, // Restauramos la escala Y correcta
                    duration: 100, ease: 'Power1' });
            }
        });
    }

    /**
     * Encuentra el objeto visual de una carta en el campo a partir de su índice.
     * @param {number} fieldIndex El índice de la carta en el `player.field` (Battlefield).
     * @param {Phaser.GameObjects.Sprite} [excludeObject=null] Un objeto a excluir de la búsqueda.
     * @returns {Phaser.GameObjects.Image|null}
     */
    findCardObjectOnField(fieldIndex, excludeObject = null) {
        // Simplificamos la búsqueda para que sea más directa y fiable.
        return this.children.list.find(child =>
            child.getData('isCardOnField') && 

            child.getData('fieldIndex') === fieldIndex
        );
    }

    // Crear mazo y cementerio
    createDecks() {
        const { width, height } = this.scale;

        // Definimos un estilo y un padding para los contadores.
        const textStyle = { 
            fontSize: '24px', 
            color: '#fff', 
            fontStyle: 'bold',
            stroke: '#000000', // Contorno negro
            strokeThickness: 5 // Grosor del contorno
        };
        const padding = 5; // Pequeño espacio desde el borde.

        // Mazo del jugador

        const playerDeckImage = this.add.image(width - 120, height - 290, 'card-back-player').setScale(0.185);
        const playerDeckBounds = playerDeckImage.getBounds();
        this.playerDeckText = this.add.text(playerDeckBounds.left + padding, playerDeckBounds.bottom - padding, this.player.deck.getCardsCount(), textStyle)
            .setOrigin(0, 1); // Anclaje en la esquina inferior izquierda.

        // Mazo del oponente
        // Corregido y asegurado: Se crea como una imagen simple, sin interactividad.
        // Se elimina cualquier posibilidad de que se le asigne un listener de clic por error.
        const opponentDeckImage = this.add.image(120, 290, 'card-back-opponent').setScale(0.185);
        const opponentDeckBounds = opponentDeckImage.getBounds();
        this.opponentDeckText = this.add.text(opponentDeckBounds.left + padding, opponentDeckBounds.bottom - padding, this.opponent.deck.getCardsCount(), textStyle)
            .setOrigin(0, 1); // Anclaje en la esquina inferior izquierda.
    }

    // Actualizar contadores de mazos
    updateDeckCounts() {
        this.playerDeckText.setText(this.player.deck.getCardsCount());
        this.opponentDeckText.setText(this.opponent.deck.getCardsCount());
        console.log('Contadores de mazo actualizados.');
    }

    // Helper: aplica los resets de restricciones por nivel al iniciar un turno propio.
    // La regla (nivel 2 descansa, nivel 3 descansa, consecutivos) vive en LevelAttackRule.
    _refreshCardTurnMetadata(cardObject, ownerType) {
        const ownTurnNumber = ownerType === 'player' ? this.turn.playerTurnNumber : this.turn.opponentTurnNumber;
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

    // Helper para contabilizar ataques por nivel. La transición de estado
    // (bloqueos del nivel 2/3 y ataques consecutivos) es resuelta por LevelAttackRule.
    _registerCardAttack(cardObject, ownerType) {
        const cardData = cardObject.getData('cardData') || cardObject.cardData;
        const level = cardData.level || 1;
        const nowTurn = ownerType === 'player' ? this.turn.playerTurnNumber : this.turn.opponentTurnNumber;

        // Progreso: los ataques del jugador alimentan la misión de tipos y la colección.
        if (ownerType === 'player' && cardData.type) {
            const username = (this.playerData && this.playerData.username) || 'Jugador';
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

    /**
     * --- NUEVO HELPER ---
     * Se llama cuando una animación bloqueante finaliza. Decrementa el contador
     * y, si no quedan más bloqueos, intenta avanzar al siguiente turno.
     */
    _animationComplete() {
        const nextTurn = this.turn.onBlockingAnimationCompleted();
        console.log('[GameScene] Animación completada. Bloqueos restantes:', this.turn.blockingAnimations);

        // Si no hay más animaciones y hay un cambio de turno pendiente...
        if (nextTurn) {
            console.log(`[GameScene] Todas las animaciones completadas. Procediendo al turno de: ${nextTurn}`);
            if (nextTurn === 'player') this.endOpponentTurn();
            else if (nextTurn === 'opponent') this.endPlayerTurn();
        }
    }

    /**
     * --- SISTEMA DE DIFICULTAD DEL BOT ---
     * (Migrado a Frontend/src/game/BotAI.js)
     */
}