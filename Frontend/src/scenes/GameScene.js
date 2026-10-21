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
import { GAME_CONFIG } from '../helpers/constants.js';
import TurnManager from '../game/TurnManager.js';
import BotAI from '../game/BotAI.js';
import VictoryEvaluator from '../game/VictoryEvaluator.js';
import CardDestructionService from '../game/CardDestructionService.js';
import LANClient from '../game/LANClient.js';
import { getGameMode } from '../game/gameModes.js';
import { getGemRequirements } from '../game/objectivesCatalog.js';
import { playGemCollectFx } from '../helpers/gemVisual.js';
import { createArena, ensureBoardTextures, slotTextureKey, BOARD_TEXTURES, OWNER_THEME, drawHandTray, ornateLabel, SLOT_W, SLOT_GAP } from '../helpers/battlefieldArt.js';
import {
    createSlotHighlight,
    createTargetMarker,
    destroyFeedbackList,
    playEvolutionBanner,
    showBattleToast,
    createTurnGlow,
    setTurnGlowActive,
    FEEDBACK_COLORS
} from '../helpers/battlePresentation.js';

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
        this.cardHandSize = { width: 148, height: 198 }; // tamaño visual en mano propia
        this.cardOpponentHandSize = { width: 132, height: 176 }; // mano rival (no tapa el perfil)
        this.cardFieldSize = { width: 128, height: 172 }; // tamaño visual en campo / fusiones
        this.selectionFeedback = []; // Highlights/marcadores temporales de la selección
        this.playerTurnGlow = null;
        this.opponentTurnGlow = null;

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
        // Modo de juego y dificultad de objetivos (gemas). El modo define las
        // condiciones de victoria/derrota; la dificultad, cuántas gemas se piden.
        this.mode = getGameMode(data.gameMode);
        this.objectiveDifficulty = data.botDifficulty || data.objectiveDifficulty || 3;
        if (this.bot && typeof this.bot.setGemFocus === 'function') {
            this.bot.setGemFocus(!!(this.mode && this.mode.usesGems));
        }
        console.log('Modo de juego:', this.mode.id, '| Dificultad de objetivos:', this.objectiveDifficulty);
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
                    const boardKeys = ['board-bg', 'slot', 'card-back-player', 'card-back-opponent',
                        'art-slot-player', 'art-slot-opponent', 'art-slot-neutral',
                        'art-slot-hand-player', 'art-slot-hand-opponent',
                        'art-vignette'];
                    const isElementFrame = typeof tex === 'string' && tex.startsWith('art-card-');
                    const isFeedbackDecor = typeof tex === 'string' && tex === 'art-slot-highlight';
                    if (boardKeys.includes(tex) || isElementFrame || isFeedbackDecor) isBoardOrDeck = true;
                } catch(e) { isBoardOrDeck = false; }

                // Feedback efímero de la selección / brillo de turno.
                const isFeedbackObj = typeof name === 'string' && (
                    name.startsWith('selection-feedback') || name === 'turn-glow'
                );

                if (hasCardData || isSlot || isBoardOrDeck || isFeedbackObj) {
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
        this.selectionFeedback = [];
        this.playerTurnGlow = null;
        this.opponentTurnGlow = null;
        if (this.turnTimer) { this.turnTimer.destroy(); this.turnTimer = null; }

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

        // Objetivos de gemas según dificultad (mismos para ambos jugadores).
        this.gemRequirements = getGemRequirements(this.objectiveDifficulty);
        this.player.gems.setRequirements(this.gemRequirements);
        this.opponent.gems.setRequirements(this.gemRequirements);

        // Estado del temporizador global (modo contrarreloj).
        this.timeExpired = false;
        this.matchTimerActive = false;
        this.matchTimerEndAt = 0;

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

        // ---------- BANDEJAS DE MANO (integración con la arena) ----------
        this.createHandTrays();

        // ---------- BRILLO DE TURNO ----------
        // Franja luminosa sobre la fila del bando activo (solo presentación).
        this.opponentTurnGlow = createTurnGlow(this, height * 0.45 - battleRowYOffset, OWNER_THEME.opponent.glow, width * 0.88)
            .setName('turn-glow');
        this.playerTurnGlow = createTurnGlow(this, height * 0.55 + battleRowYOffset, OWNER_THEME.player.glow, width * 0.88)
            .setName('turn-glow');

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

                // Arranca el reloj de partida (contrarreloj) y publica los objetivos.
                this.startMatchTimer();
                this.events.emit('objectives-ready', this.getObjectivesPayload());
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
            // limpiar feedback de selección y brillos de turno
            this.clearSelectionFeedback();
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
            showBattleToast(this, 'Ya realizaste tu acción este turno.', 0x9fb0c8);
            return;
        }
        if (this.turn.playerMustAttackThisTurn) {
            console.log('[GameScene] Estás obligado a atacar este turno. No puedes colocar cartas.');
            showBattleToast(this, '¡Estás obligado a atacar este turno!', FEEDBACK_COLORS.attack);
            return;
        }

        // Obtenemos los datos de la carta seleccionada y el índice del slot.
        const cardDataFromHand = this.selectedCard.cardData;
        const fieldIndex = parseInt(dropZone.name.split('-')[1]);
        const targetCardData = this.player.field[fieldIndex];

        console.log('[GameScene] Intento de jugar carta en slot', { slotIndex: fieldIndex, cardFromHand: cardDataFromHand && { id: cardDataFromHand.id, instanceId: cardDataFromHand.instanceId, type: cardDataFromHand.type, level: cardDataFromHand.level } });
        if (this.debugSync) {
            console.log('[GameScene][debug] pre-play state:', {
                playerField: this.player.field.map(f => f && f.instanceId),
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
                    this.selectedCard.setDepth(1);
                    // Aura elemental del elemento de la carta al entrar en el campo.
                    if (cardPlayed && cardPlayed.type && typeof this.selectedCard.attachAura === 'function') {
                        this.selectedCard.attachAura(TYPE_COLORS[cardPlayed.type] || 0xffffff);
                    }

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
            showBattleToast(this, 'Ese slot está ocupado.', 0x9fb0c8);
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
            showBattleToast(this, 'Ya realizaste tu acción este turno.', 0x9fb0c8);
            return;
        }
        if (this.turn.playerMustAttackThisTurn) {
            console.log('[GameScene] Estás obligado a atacar este turno. No puedes fusionar.');
            showBattleToast(this, '¡Estás obligado a atacar este turno!', FEEDBACK_COLORS.attack);
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
            showBattleToast(this, 'Ambas cartas deben estar en el campo.', 0x9fb0c8);
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
            showBattleToast(this, 'Solo fusionan cartas del mismo elemento y nivel.', FEEDBACK_COLORS.fusion);
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
            if (!this.player.field[idx]) {
                const cd = (cardObj.getData && cardObj.getData('cardData')) || cardObj.cardData;
                if (cd) {
                    console.warn('[GameScene] Sincronizando modelo: rellenando player.field[' + idx + '] desde objeto visual', cd);
                    this.player.field[idx] = cd;
                }
            } else {
                // Si existe modelo pero difiere de la vista, informar
                const modelCd = this.player.field[idx];
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
                // Banner de evolución (presentación): celebra el nuevo nivel.
                playEvolutionBanner(this, fusionPosition.x, fusionPosition.y - 18, TYPE_COLORS[fusedCardData.type] || 0xffffff, fusedCardData.level);                // Progreso: la fusión cuenta y la carta resultante entra en la colección.
                recordFusion((this.playerData && this.playerData.username) || 'Jugador');
                recordCollectedCard((this.playerData && this.playerData.username) || 'Jugador', fusedCardData.type, fusedCardData.level);
                // Gema elemental: una por carta de nivel 3.
                const gemType = this.player.registerGem(fusedCardData);
                if (gemType) this.showGemPopup(fusionPosition.x, fusionPosition.y - 30, gemType);
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
            showBattleToast(this, 'Ya realizaste tu acción este turno.', 0x9fb0c8);
            return;
        }
        if (this.turn.playerMustAttackThisTurn) {
            console.log('[GameScene] Estás obligado a atacar este turno. No puedes fusionar.');
            showBattleToast(this, '¡Estás obligado a atacar este turno!', FEEDBACK_COLORS.attack);
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
            showBattleToast(this, 'Solo fusionan cartas del mismo elemento y nivel.', FEEDBACK_COLORS.fusion);
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
                // Banner de evolución (presentación): celebra el nuevo nivel.
                playEvolutionBanner(this, fusionPosition.x, fusionPosition.y - 18, TYPE_COLORS[fusionResult.type] || 0xffffff, fusionResult.level);
                // Progreso: la fusión cuenta y la carta resultante entra en la colección.
                recordFusion((this.playerData && this.playerData.username) || 'Jugador');
                recordCollectedCard((this.playerData && this.playerData.username) || 'Jugador', fusionResult.type, fusionResult.level);
                // Gema elemental: una por carta de nivel 3.
                const gemType = this.player.registerGem(fusionResult);
                if (gemType) this.showGemPopup(fusionPosition.x, fusionPosition.y - 30, gemType);
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
        setTurnGlowActive(this, this.opponentTurnGlow, true);
        setTurnGlowActive(this, this.playerTurnGlow, false);
        this.events.emit('update-turn-counter', this.turn.playerTurnNumber, this.mode ? this.mode.maxTurns : null);
        let opponentHasActed = false;

        // Limpieza bloqueos vencidos y reset consecutiveAttacks si no atacó el turno anterior
        const opponentFieldCardObjects = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField'));
        opponentFieldCardObjects.forEach(cardObj => {
            if (cardObj.getData('lastAttackedTurn') !== (this.turn.opponentTurnNumber - 1)) {
                cardObj.setData('consecutiveAttacks', 0);
            }
            const blocked = cardObj.getData('blockedTurn');
            if (typeof blocked === 'number' && blocked < this.turn.opponentTurnNumber) {
                cardObj.setData('blockedTurn', null);
            }
        });

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
            playerHasField: this.player.field.some(c => c !== null),
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
        const origA = this.opponent.field[idxA];
        const origB = this.opponent.field[idxB];
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
        // Gema elemental del oponente (una por carta de nivel 3).
        const gemType = this.opponent.registerGem(res.newCard);
        if (gemType && fusedObj) this.showGemPopup(fusedObj.x, fusedObj.y - 30, gemType);
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
                else if (res.loser === 'defender') this.destroyCard(this.player, defenderObj.getData('fieldIndex'));
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
        if (!cardToPlay || this.opponent.field[slotIndex] !== null) return false;
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
        if (cardData && cardData.level === 3 && typeof cardObject.addGemBadge === 'function') {
            cardObject.addGemBadge();
        }
        if (cardData && cardData.type && typeof cardObject.attachAura === 'function') {
            cardObject.attachAura(TYPE_COLORS[cardData.type] || 0xffffff);
        }
    }


    /**
     * Inicia el turno del jugador, reseteando flags y activando el temporizador.
     */
    startPlayerTurn() {
        this.turn.beginPlayerTurn();
        setTurnGlowActive(this, this.playerTurnGlow, true);
        setTurnGlowActive(this, this.opponentTurnGlow, false);

        console.log('[GameScene] Inicio del turno del JUGADOR', { turnNumber: this.turn.playerTurnNumber, mustAttack: this.turn.playerMustAttackThisTurn });
        this.events.emit('update-turn-indicator', 'player');
        this.events.emit('update-turn-counter', this.turn.playerTurnNumber, this.mode ? this.mode.maxTurns : null);
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
            // Si no atacó en turno previo, y no hay cooldown, reset de consecutiveAttacks
            if (cardObj.getData('lastAttackedTurn') !== (this.turn.playerTurnNumber - 1)) {
                cardObj.setData('consecutiveAttacks', 0);
            }
        });

        // --- TEMPORIZADOR REDUCIDO A 12s ---
        if (this.turnTimer) this.turnTimer.destroy();
        this.turnTimer = this.time.addEvent({
            delay: GAME_CONFIG.TURN_TIME_LIMIT_MS,
            callback: this._playerTimedOut,
            callbackScope: this
        });

        // Si está obligado a atacar y NO tiene cartas en campo: saltar el turno y reiniciar contador.
        const playerHasFieldCards = this.player.field.some(c => c !== null);
        if (this.turn.playerMustAttackThisTurn && !playerHasFieldCards) {
                console.log('[GameScene] Obligado a atacar pero no tiene cartas -> salto de turno automático', { playerTurnsSinceLastAttack: this.turn.playerTurnsSinceLastAttack });
            this.turn.resetForcedAttackSkip();
            this.endPlayerTurn();
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
     */
    endPlayerTurn() {
        if (this.turn.state !== 'player-turn') return;
        // Si hay animaciones en curso, solo marcamos el cambio de turno como pendiente.
        if (!this.turn.requestTurnEnd('opponent')) return;

        console.log('[GameScene] Fin del turno del JUGADOR', { playerHasActed: this.turn.playerHasActed, performedAttack: this.turn.playerPerformedAttackThisTurn, turnNumber: this.turn.playerTurnNumber });

        if (this.turnTimer) this.turnTimer.destroy();
        // Comprobamos inactividad y actualizamos contadores de ataque
        const turnReport = this.turn.finishPlayerTurn();
        if (!this.turn.playerHasActed) {
            console.log('[GameScene] Jugador inactivo', { inactiveTurns: turnReport.inactiveTurns });
        }
        // Notificamos el contador a la UI
        this.events.emit('update-attack-counter', 'player', this.turn.playerTurnsSinceLastAttack + 1, this.turn.playerMustAttackThisTurn);

        // Deseleccionamos cualquier carta
        this.deselectCard(false);

        // Comprobamos condiciones de victoria antes de pasar el turno
        const outcome = this.checkVictoryConditions();
        if (outcome.winner || outcome.reason === 'timeExpired') {
            this.endGame(outcome.winner, outcome.reason);
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
        const outcome = this.checkVictoryConditions();
        if (outcome.winner || outcome.reason === 'timeExpired') {
            this.endGame(outcome.winner, outcome.reason);
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

        // Reloj global de partida (modo contrarreloj).
        if (this.matchTimerActive && !this.timeExpired) {
            const remaining = Math.max(0, this.matchTimerEndAt - this.time.now);
            this.events.emit('update-match-timer', Math.ceil(remaining / 1000));
            if (remaining <= 0) {
                this.timeExpired = true;
                this.matchTimerActive = false;
                console.log('[GameScene] Tiempo de partida agotado -> ambos pierden');
                this.endGame(null, 'timeExpired');
            }
        }
    }

    /**
     * Arranca el reloj global de la partida si el modo lo define (contrarreloj).
     */
    startMatchTimer() {
        if (!this.mode || !this.mode.matchTimeMs) {
            this.matchTimerActive = false;
            this.events.emit('update-match-timer', -1);
            return;
        }
        this.timeExpired = false;
        this.matchTimerActive = true;
        this.matchTimerEndAt = this.time.now + this.mode.matchTimeMs;
        this.events.emit('update-match-timer', Math.ceil(this.mode.matchTimeMs / 1000));
    }

    /**
     * Empaqueta el estado de objetivos y gemas para la UI.
     * @returns {object}
     */
    getObjectivesPayload() {
        return {
            mode: this.mode,
            requirements: this.gemRequirements,
            maxTurns: this.mode ? this.mode.maxTurns : null,
            player: this.player.gems.progress(),
            opponent: this.opponent.gems.progress()
        };
    }

    /**
     * Muestra la animación de recogida de una gema en el punto de la fusión.
     * @param {number} x
     * @param {number} y
     * @param {string} gemType Elemento de la gema ('fuego', 'agua', ...).
     */
    showGemPopup(x, y, gemType) {
        playGemCollectFx(this, x, y, gemType, { label: '+1 GEMA' });
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
            showBattleToast(this, 'Ya realizaste tu acción este turno.', 0x9fb0c8);
            return;
        }

        // Restricción por nivel: comprobar blockedTurn en lugar de solo cooldown
        const blocked = attackingCardObject.getData('blockedTurn');
        if (blocked === this.turn.playerTurnNumber) {
            console.log('[GameScene] Esta carta está descansando este turno (restricción por nivel).');
            showBattleToast(this, 'Esta carta debe descansar este turno.', 0x9fb0c8);
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
        const result = resolveCombat(attackerData, defenderData);
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
     * @returns {{winner: string|null, reason: string|null, log: string|null}}
     */
    checkVictoryConditions() {
        const result = VictoryEvaluator.evaluate({
            player: this.player,
            opponent: this.opponent,
            turn: this.turn,
            config: GAME_CONFIG,
            gems: { player: this.player.gems, opponent: this.opponent.gems },
            mode: this.mode,
            timeExpired: this.timeExpired
        });
        if (result.log) console.log(result.log);
        return result;
    }

    /**
     * Finaliza la partida y muestra un mensaje de victoria/derrota.
     * @param {string} winner El ganador de la partida ('player' u 'opponent').
     */
    endGame(winner, reason = null) {
        this.turn.state = 'game-over';
        if (this.turnTimer) this.turnTimer.destroy();
        this.matchTimerActive = false;
        this.events.emit('update-timer', 0); // Limpia el contador en la UI
        this.events.emit('update-match-timer', 0); // Limpia el reloj de partida
        // No hay botón de terminar turno ahora.

        console.log('[GameScene] Fin de la partida. Ganador:', winner, '| Motivo:', reason);

        // Progreso real: cada victoria/derrota se cuenta y alimenta misiones y logros.
        const username = (this.playerData && this.playerData.username) || 'Jugador';
        if (winner === 'player') {
            recordVictory(username);
            const fieldCards = (this.player.field || []).filter(c => c);
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
        this.events.emit('game-over', winner, reason);
    }

    /**
     * Destruye una carta del campo de forma robusta.
     * Acepta instanceId opcional para desambiguar si el modelo y la vista se desincronizan.
     */
    destroyCard(owner, fieldIndex, instanceId = null) {
        if (this.debugSync) console.log('[GameScene][debug] destroyCard called', { owner: owner && owner.id, fieldIndex, instanceId, timestamp: Date.now() });
        // Intentar obtener cardData desde el modelo
        let cardData = (typeof fieldIndex === 'number' && owner.field[fieldIndex]) ? owner.field[fieldIndex] : null;

        // si hay instanceId y el modelo no coincide, buscar en el modelo por instanceId
        if ((!cardData || (instanceId && cardData.instanceId !== instanceId)) && instanceId) {
            const foundIdx = owner.field.findIndex(slot => slot && slot.instanceId === instanceId);
            if (foundIdx !== -1) {
                fieldIndex = foundIdx;
                cardData = owner.field[fieldIndex];
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
            if (typeof fieldIndex === 'number' && owner.field[fieldIndex]) {
                console.log('[GameScene] destroyCard: limpiando modelo en slot', fieldIndex);
                owner.field[fieldIndex] = null;
            }
            return;
        }

        // Si tenemos modelo pero no objeto visual, intentar borrar solo modelo
        if (cardData && !cardObject) {
            console.warn('[GameScene] destroyCard: objeto visual no encontrado. Actualizando solamente el modelo.', { owner: owner.id, fieldIndex, cardData });
            // Marcar como en proceso para evitar reentradas
            if (finalInstanceId) this._pendingDestroys.add(finalInstanceId);

            // llevar carta(s) al cementerio según nivel
            CardDestructionService.graveyardEntries(cardData).forEach(entry => owner.addCardDataToGraveyard(entry));

            if (typeof fieldIndex === 'number') owner.field[fieldIndex] = null;
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
            CardDestructionService.graveyardEntries(cardData).forEach(entry => owner.addCardDataToGraveyard(entry));
            if (typeof fieldIndex === 'number') {
                console.log('[GameScene] destroyCard: limpiando modelo (owner.field) en slot', fieldIndex, 'valor previo:', owner.field[fieldIndex]);
                owner.field[fieldIndex] = null;
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
    // Arena cinematográfica: losa de piedra con perspectiva, emblema central con
    // anillo giratorio, franjas de energía (roja oponente / azul jugador), marcos
    // ornamentales sobre las filas reales, seis cristales elementales, ruinas y
    // motas ambientales. Todo se agrupa en this.fieldDecor (bajo las cartas).
    createFieldDecor() {
        ensureBoardTextures(this);
        this.fieldDecor = createArena(this, {
            width: this.scale.width,
            height: this.scale.height,
            depth: -0.4
        });
    }

    // Crear fila de slots con marcos ornamentados proceduales.
    // Los slots de batalla usan marcos con borde luminoso (rojo = oponente,
    // azul = jugador) y conservan su nombre/posición/interactividad original.
    createSlotsRow(y, name, numSlots = 4) { // Por defecto crea 4 slots
        const slots = [];
        // Misma métrica que la arena y los marcos de carta (SLOT_W/SLOT_GAP).
        const slotWidth = SLOT_W;
        const slotSpacing = SLOT_GAP;
        const positionsX = calculateRowPositions({
            numItems: numSlots,
            itemWidth: slotWidth,
            itemSpacing: slotSpacing,
            containerWidth: this.scale.width
        });

        const isBattle = name.includes('_battle_');
        const owner = name.startsWith('opponent') ? 'opponent' : 'player';
        const textureKey = isBattle ? slotTextureKey(owner) : BOARD_TEXTURES.slotNeutral;

        for (let i = 0; i < numSlots; i++) {
            let slot = this.add.image(positionsX[i], y, textureKey)
                .setAlpha(isBattle ? 1 : 0.5)
                // Los slots interactivos van por ENCIMA del vídeo de fondo y de la
                // decoración para recibir el clic (el board está a depth -1, la
                // arena a -0.4; el feedback de selección se ajusta por debajo).
                .setDepth(isBattle ? 0.2 : -0.2)
                .setName(`${name}-${i}`); // Asignamos un nombre único para identificarlo

            // Si es un slot del campo de batalla del jugador, lo hacemos una zona de drop
            if (name === 'player_battle_slots') {
                slot.setInteractive({ dropZone: true, useHandCursor: true }); // CORRECCIÓN: Aseguramos que sea dropzone
                // Le añadimos un listener para cuando se haga clic en él
                slot.on('pointerdown', (pointer, localX, localY, event) => {
                    if (event && event.stopPropagation) event.stopPropagation();
                    this.onSlotClicked(slot);
                });
            } else if (name === 'opponent_battle_slots') {
                // Hacemos que los slots del oponente sean interactivos para poder hacerles clic.
                slot.setInteractive({ useHandCursor: true });
                slot.on('pointerdown', (pointer, localX, localY, event) => {
                    if (event && event.stopPropagation) event.stopPropagation();
                    this.onOpponentSlotClicked(slot);
                });
            }

            slots.push(slot);
        }

        this[name] = slots;
    }

    // Crear fila de cartas (mano). Tras crearlas, se aplica el abanico:
    // las cartas se superponen ligeramente, rotan y se arquean en vertical.
    createCardsRow(y, name, hand) {
        const cards = [];
        const numCards = hand.length;
        const isPlayerHand = name === 'player-cards';
        const cardWidth = isPlayerHand ? this.cardHandSize.width : this.cardOpponentHandSize.width;
        const cardSpacing = isPlayerHand ? 44 : 64; // la mano rival evita el panel de perfil
        const positionsX = calculateRowPositions({
            numItems: numCards,
            itemWidth: cardWidth,
            itemSpacing: cardSpacing,
            containerWidth: this.scale.width
        });

        for (let i = 0; i < numCards; i++) {
            const cardData = hand[i];

            let card;
            if (isPlayerHand) {
                card = this.createPlayerCard(positionsX[i], y, cardData);
            } else {
                card = this.createOpponentCard(positionsX[i], y, cardData);
            }

            cards.push(card);
        }

        this[name] = cards;
        this.layoutHandRows();
    }

    /**
     * Aplica la disposición de abanico (rotación + arco vertical) a las cartas
     * de ambas manos. La posición base se guarda en 'startPosition'; la
     * selección/animación parten de ella, por lo que el abanico es la pose de
     * reposo y sigue siendo 100% compatible con la interacción por clic.
     */
    layoutHandRows() {
        const applyFan = (cards, name) => {
            if (!cards || !cards.length) return;
            const isPlayer = name === 'player-cards';
            const n = cards.length;
            const spread = 3.0;             // grados entre cartas contiguas
            const arc = 12;                 // arco vertical del abanico (px)
            const hoverLift = isPlayer ? 22 : 16;

            cards.forEach((card, i) => {
                if (!card || !card.active) return;
                const center = (n - 1) / 2;
                const t = n > 1 ? (i - center) / center : 0; // -1..1
                const angle = t * spread * (n > 1 ? Math.min(1, n / 3) : 0);
                const dy = Math.abs(t) * arc * (isPlayer ? 1 : -1);

                const baseX = card.x;
                const baseY = card.getData('startPosition')?.y ?? card.y;
                const fanY = baseY + dy;

                card.setData('startPosition', { x: baseX, y: fanY });
                card.setData('fanAngle', angle);
                card.setData('hoverLift', hoverLift);
                card.setAngle(angle);
                card.setDepth(1 + i * 0.01);
                this.tweens.add({ targets: card, y: fanY, duration: 200, ease: 'Sine.easeOut' });
            });
        };

        applyFan(this['player-cards'], 'player-cards');
        applyFan(this['opponent-cards'], 'opponent-cards');
    }

    // Bandejas ornamentadas bajo las manos para integrarlas con la arena.
    createHandTrays() {
        const { width, height } = this.scale;
        if (this.playerHandTray) this.playerHandTray.destroy();
        if (this.opponentHandTray) this.opponentHandTray.destroy();

        this.playerHandTray = drawHandTray(this, width / 2, height * 0.875, 1560, 190, 'player')
            .setDepth(-0.3);
        this.opponentHandTray = drawHandTray(this, width / 2, height * 0.155, 1300, 150, 'opponent')
            .setDepth(-0.3);

        if (this.playerHandLabel) this.playerHandLabel.destroy();
        if (this.opponentHandLabel) this.opponentHandLabel.destroy();
        // 'TU MANO' se baja al borde inferior de la bandeja: a la altura de las
        // cartas la tapaba el orbe de esencia del jugador (179, 847).
        this.playerHandLabel = ornateLabel(this, 210, height - 60, 'TU MANO', {
            fontSize: '13px', color: '#bfe1ff', letterSpacing: 3
        }).setDepth(-0.2);
        // 'MANO RIVAL' se baja bajo el panel de perfil (que ocupa y 88-212).
        this.opponentHandLabel = ornateLabel(this, 230, 250, 'MANO RIVAL', {
            fontSize: '13px', color: '#ffc2ad', letterSpacing: 3
        }).setDepth(-0.2);
    }

    // Crear carta del jugador
    createPlayerCard(x, y, cardData) {
        const card = new Card(this, x, y, cardData, false); // Crear la carta en su posición final
        card.setDisplaySize(this.cardHandSize.width, this.cardHandSize.height); // Tamaño unificado
        card.setData('startPosition', { x, y });
        card.setData('isRevealed', false);
        card.setData('isCardOnField', false);
        if (cardData && cardData.level === 3) card.addGemBadge();
        card.on('pointerdown', () => this.onCardClicked(card));
        // Hover: elevación y brillo suaves al pasar el cursor.
        card.on('pointerover', () => this.onCardHover(card, true));
        card.on('pointerout', () => this.onCardHover(card, false));
        card.input.cursor = 'pointer';

        return card;
    }

    /** Efecto de hover para cartas de la mano (elevación + brillo). */
    onCardHover(card, over) {
        if (!card || !card.active || card === this.selectedCard) return;
        if (card.getData('isCardOnField')) return;
        const base = card.getData('startPosition');
        if (!base) return;
        if (over) card.setDepth(25);
        this.tweens.add({
            targets: card,
            y: over ? base.y - (card.getData('hoverLift') || 22) : base.y,
            duration: 140,
            ease: 'Sine.easeOut',
            onComplete: () => { if (!over) this.layoutHandRows(); }
        });
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
            const opponentFieldCards = this.opponent.field.filter(card => card !== null);
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
            const opponentHasCards = this.opponent.field.some(card => card !== null);
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
        const yShift = isOnField ? -25 : -(cardObject.getData('hoverLift') || 50); // Se levanta más si está en la mano
        cardObject.setDepth(isOnField ? 20 : 30); // La carta activa se ve por encima del resto
        this.tweens.add({
            targets: cardObject,
            y: cardObject.getData('startPosition').y + yShift,
            angle: 0,
            duration: 150,
            ease: 'Power1'
        });
        // Resplandor pulsante del elemento y feedback de acciones disponibles.
        if (typeof cardObject.setSelectedVisual === 'function') cardObject.setSelectedVisual(true);
        this.refreshSelectionFeedback();
    }

    /**
     * Muestra las acciones disponibles para la carta seleccionada (responsabilidad
     * de presentación): slots válidos para colocar, objetivos de ataque con su
     * predicción de combate y fusiones compatibles en el campo.
     */
    refreshSelectionFeedback() {
        this.clearSelectionFeedback();
        const sel = this.selectedCard;
        if (!sel || !sel.active) return;

        const mark = (obj, name = 'selection-feedback') => {
            obj.setName?.(name);
            this.selectionFeedback.push(obj);
        };
        const attackerData = sel.cardData || sel.getData('cardData');
        const selOnField = !!sel.getData('isCardOnField');

        // Carta de la mano: resaltar slots vacíos del campo propio.
        if (!selOnField) {
            (this['player_battle_slots'] || []).forEach((slot, i) => {
                if (this.player.field[i] === null) {
                    mark(createSlotHighlight(this, slot.x, slot.y, FEEDBACK_COLORS.valid, 0.3));
                }
            });
            return;
        }

        // Carta en el campo: objetivos de ataque.
        const opponentCards = this.children.list.filter(
            (c) => c.getData && c.getData('isOpponentCard') && c.getData('isCardOnField')
        );
        if (opponentCards.length && attackerData) {
            opponentCards.forEach((target) => {
                const targetData = target.getData('cardData') || target.cardData;
                if (!targetData) return;
                const result = resolveCombat(attackerData, targetData);
                const kind = result.winner === 'attacker' ? 'advantage'
                    : result.winner === 'defender' ? 'disadvantage'
                        : 'neutral';
                mark(createTargetMarker(this, target.x, target.y - target.displayHeight / 2 + 8, kind));
            });
        } else {
            // Ataque directo: resaltar la fila rival.
            (this['opponent_battle_slots'] || []).forEach((slot) => {
                mark(createSlotHighlight(this, slot.x, slot.y, FEEDBACK_COLORS.attack, 0.3));
            });
        }

        // Fusiones posibles entre cartas propias del campo (mismo tipo y nivel).
        if (attackerData) {
            this.children.list.forEach((target) => {
                if (!target.getData || target === sel) return;
                if (!target.getData('isCardOnField') || target.getData('isOpponentCard')) return;
                const td = target.getData('cardData') || target.cardData;
                if (!td) return;
                if (td.type === attackerData.type && td.level === attackerData.level && td.level < 3) {
                    mark(createTargetMarker(this, target.x, target.y - target.displayHeight / 2 + 8, 'fusion'));
                }
            });
        }
    }

    /** Destruye suavemente los highlights/marcadores de la selección actual. */
    clearSelectionFeedback() {
        if (!this.selectionFeedback || !this.selectionFeedback.length) return;
        destroyFeedbackList(this, this.selectionFeedback);
        this.selectionFeedback = [];
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

        if (typeof cardToDeselect.setSelectedVisual === 'function') cardToDeselect.setSelectedVisual(false);
        this.clearSelectionFeedback();

        // Si se debe animar, la carta (esté en la mano o en el campo) vuelve
        // a su posición original guardada en 'startPosition'.
        if (animate) {
            const onField = !!cardToDeselect.getData('isCardOnField');
            this.tweens.add({
                targets: cardToDeselect,
                x: cardToDeselect.getData('startPosition').x,
                y: cardToDeselect.getData('startPosition').y,
                angle: onField ? 0 : (cardToDeselect.getData('fanAngle') || 0),
                duration: 200,
                ease: 'Power1',
                onComplete: () => {
                    if (onField) cardToDeselect.setDepth(1);
                    else this.layoutHandRows();
                }
            });
        } else {
            const onField = !!cardToDeselect.getData('isCardOnField');
            if (onField) cardToDeselect.setDepth(1);
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
        this.createCardsRow(this.scale.height * 0.825, 'player-cards', this.player.hand);
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
        // Normalizamos el tamaño visual del reverso para no tapar el perfil rival.
        card.setDisplaySize(this.cardOpponentHandSize.width, this.cardOpponentHandSize.height);
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
        // Las cartas de campo van por encima de los marcos de slot y de la arena
        // (el aura elemental se dibuja a depth 0.5, entre slot y carta).
        cardObj.setDepth(1);
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
        // Gema distintiva en cartas de nivel 3 visibles (no en rivales boca abajo).
        if (cardData && cardData.level === 3 && (!isOpponent || revealed)) {
            cardObj.addGemBadge();
        }
        // Aura elemental en cartas reveladas (identidad visual por elemento).
        if (cardData && cardData.type && (!isOpponent || revealed)) {
            cardObj.attachAura(TYPE_COLORS[cardData.type] || 0xffffff);
        }
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
                    if (this.debugSync) console.log('[GameScene][debug] handling remote play_card', { cardInstanceId: card && card.instanceId, fieldIndex, targetBefore: targetModel.field.map(f=>f&&f.instanceId), timestamp: Date.now() });
                    targetModel.field[fieldIndex] = card;
                    if (this.debugSync) console.log('[GameScene][debug] model updated for remote play_card', { targetAfter: targetModel.field.map(f=>f&&f.instanceId) });
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
                if (this.debugSync) console.log('[GameScene][debug] handling remote fuse_cards', { sourceIndex, targetIndex, resultCardInstanceId: resultCard && resultCard.instanceId, targetBefore: targetModel.field.map(f=>f&&f.instanceId), timestamp: Date.now() });
                targetModel.field[sourceIndex] = null;
                targetModel.field[targetIndex] = resultCard;
                if (this.debugSync) console.log('[GameScene][debug] model updated for remote fuse_cards', { targetAfter: targetModel.field.map(f=>f&&f.instanceId) });
                
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
                    // Gema elemental remota (una por carta de nivel 3).
                    if (targetModel && typeof targetModel.registerGem === 'function') {
                        const gemType = targetModel.registerGem(resultCard);
                        if (gemType) this.showGemPopup(fusedObj.x, fusedObj.y - 30, gemType);
                    }
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
                if (this.debugSync) console.log('[GameScene][debug] handling remote fuse_from_hand', { targetIndex, resultCardInstanceId: resultCard && resultCard.instanceId, targetBefore: targetModel.field.map(f=>f&&f.instanceId), timestamp: Date.now() });
                targetModel.field[targetIndex] = resultCard;
                if (this.debugSync) console.log('[GameScene][debug] model updated for remote fuse_from_hand', { targetAfter: targetModel.field.map(f=>f&&f.instanceId) });
                
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
                    // Gema elemental remota (una por carta de nivel 3).
                    if (targetModel && typeof targetModel.registerGem === 'function') {
                        const gemType = targetModel.registerGem(resultCard);
                        if (gemType) this.showGemPopup(fusedObj.x, fusedObj.y - 30, gemType);
                    }
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
        if (cardData.level === 3 && typeof cardObject.addGemBadge === 'function') {
            cardObject.addGemBadge();
        }
        if (cardData.type && typeof cardObject.attachAura === 'function') {
            cardObject.attachAura(TYPE_COLORS[cardData.type] || 0xffffff);
        }

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
     * @param {number} fieldIndex El índice de la carta en el array `player.field`.
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

    // Crear los mazos con marco luminoso por bando y contador en insignia.
    // Conserva this.playerDeckText / this.opponentDeckText (los usa updateDeckCounts).
    createDecks() {
        const { width, height } = this.scale;

        const textStyle = {
            fontSize: '26px',
            color: '#ffffff',
            fontStyle: 'bold',
            fontFamily: 'Georgia, "Times New Roman", serif',
            stroke: '#000000',
            strokeThickness: 5
        };

        const buildDeck = (x, y, backKey, owner, count) => {
            const theme = OWNER_THEME[owner];

            // Resplandor, anillo ornamentado y placa bajo el mazo.
            const glow = this.add.graphics().setDepth(-0.06);
            glow.fillStyle(theme.glow, 0.05).fillCircle(x, y, 104);
            glow.fillStyle(theme.glow, 0.09).fillCircle(x, y, 72);
            glow.fillStyle(0x05070e, 0.55).fillRoundedRect(x - 44, y - 62, 88, 124, 14);
            glow.lineStyle(2, theme.rune, 0.32).strokeRoundedRect(x - 44, y - 62, 88, 124, 14);
            glow.lineStyle(2, theme.rune, 0.40).strokeCircle(x, y, 64);
            glow.lineStyle(1, theme.glow, 0.55).strokeCircle(x, y, 76);
            for (let a = 0; a < 8; a++) {
                const ang = (a * Math.PI) / 4;
                glow.fillStyle(theme.rune, 0.7).fillCircle(x + Math.cos(ang) * 70, y + Math.sin(ang) * 70, 2.5);
            }

            // Varias capas de reverso para dar volumen de "pila" de cartas.
            this.add.image(x - 5, y - 5, backKey).setScale(0.185).setDepth(0.6).setAlpha(0.55).setTint(0x7788aa);
            this.add.image(x - 2.5, y - 2.5, backKey).setScale(0.185).setDepth(0.8).setAlpha(0.8);
            const img = this.add.image(x, y, backKey).setScale(0.185).setDepth(1);
            const bounds = img.getBounds();

            // Insignia con el número de cartas restantes.
            const badgeX = bounds.right - 4;
            const badgeY = bounds.bottom - 4;
            const badge = this.add.graphics().setDepth(2);
            badge.fillStyle(0x000000, 0.4).fillCircle(badgeX + 2, badgeY + 2, 22);
            badge.fillStyle(0x070a14, 0.96).fillCircle(badgeX, badgeY, 22);
            badge.lineStyle(3, theme.rune, 0.95).strokeCircle(badgeX, badgeY, 22);
            badge.lineStyle(1, 0xffffff, 0.25).strokeCircle(badgeX, badgeY, 17);

            return this.add.text(badgeX, badgeY, count, textStyle).setOrigin(0.5).setDepth(3);
        };

        this.playerDeckText = buildDeck(width - 120, height - 290, 'card-back-player', 'player', this.player.deck.getCardsCount());
        this.opponentDeckText = buildDeck(120, 290, 'card-back-opponent', 'opponent', this.opponent.deck.getCardsCount());
    }

    // Actualizar contadores de mazos
    updateDeckCounts() {
        this.playerDeckText.setText(this.player.deck.getCardsCount());
        this.opponentDeckText.setText(this.opponent.deck.getCardsCount());
        console.log('Contadores de mazo actualizados.');
    }

    // Nuevo helper para aplicar cooldowns y contabilizar ataques por nivel
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

        const last = cardObject.getData('lastAttackedTurn') || null;
        const consecutive = cardObject.getData('consecutiveAttacks') || 0;
        let newConsecutive = (last === (nowTurn - 1)) ? (consecutive + 1) : 1;
        cardObject.setData('lastAttackedTurn', nowTurn);
        cardObject.setData('consecutiveAttacks', newConsecutive);

        if (level === 1) {
            // sin bloqueo
            cardObject.setData('blockedTurn', null);
        } else if (level === 2) {
            // puede atacar 2 turnos seguidos, luego descansar 1 turno propio
            if (newConsecutive >= 2) {
                // bloquea exactamente el siguiente turno propio
                cardObject.setData('blockedTurn', nowTurn + 1);
                cardObject.setData('consecutiveAttacks', 0);
                console.log(`[GameScene] Carta ${cardData.id} bloqueada para el turno ${nowTurn + 1} (nivel 2).`);
            } else {
                cardObject.setData('blockedTurn', null);
            }
        } else if (level === 3) {
            // ataca 1 turno -> descansa 1 turno propio
            cardObject.setData('blockedTurn', nowTurn + 1);
            cardObject.setData('consecutiveAttacks', 0);
            console.log(`[GameScene] Carta ${cardData.id} bloqueada para el turno ${nowTurn + 1} (nivel 3).`);
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