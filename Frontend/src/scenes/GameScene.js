import Phaser from 'phaser';
import { calculateRowPositions } from '../helpers/zone';
import { resolveCombat } from '../helpers/combat';
import Player from '../game_objects/player.js';
import Card from '../game_objects/card.js';
import { CardDefinitions } from '../game_objects/card-definitions.js';

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

        this.gameState = 'pre-start'; // 'pre-start', 'player-turn', 'opponent-turn', 'game-over'
        this.turnTimer = null; // Referencia al temporizador del turno

        // Control de acciones / ataques obligatorios / turnos ---
        this.playerHasActed = false; // Flag para controlar si ya realizó su 1 acción
        this.opponentHasActed = false;
        this.playerPerformedAttackThisTurn = false; // Si el jugador atacó en el turno
        this.opponentPerformedAttackThisTurn = false;
        this.playerTurnsSinceLastAttack = 0; // Cuántos turnos propios pasaron desde su último ataque
        this.opponentTurnsSinceLastAttack = 0;
        this.playerMustAttackThisTurn = false;
        this.opponentMustAttackThisTurn = false;

        // Conteo de turns para restricciones por carta (para cada jugador)
        this.playerTurnNumber = 0;
        this.opponentTurnNumber = 0;

        // Contadores de inactividad
        this.playerInactiveTurns = 0; // Contador de turnos inactivos del jugador
        this.opponentInactiveTurns = 0; // Contador de turnos inactivos del oponente

        // --- Control de animaciones y flujo de turnos ---
        this.blockingAnimations = 0; // Contador para animaciones que deben completarse antes de pasar de turno.
        this.pendingTurnChange = null; // Almacena el próximo turno a iniciar ('player' u 'opponent').
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
        this.botDifficulty = data.botDifficulty || 3; // 1-10, default: Normal (3)
        console.log('GameScene iniciada con los datos del jugador:', this.playerData);
        console.log('Modo LAN:', this.isLAN, 'Rol:', this.playerRole);
        console.log('Dificultad del bot:', this.botDifficulty, '(1=Muy Fácil, 10=Mito)');
    }

    preload() {
        // Fondo general
        this.load.video('campo-video', '/assets/images/campo juego/campo.mp4', { muted: true });

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
        this.gameState = 'pre-start';
        this.playerHasActed = false;
        this.opponentHasActed = false;
        // Set para marcar destrucciones en curso y evitar doble procesamiento
        this._pendingDestroys = new Set();
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

        // Mostramos un mensaje de bienvenida con el nombre del usuario temporal.
        console.log(`¡Bienvenido a GameScene, ${this.playerData?.username || 'Jugador'}!`);
        // Si estamos en modo LAN y tenemos socket, conectar manejadores de red
        if (this.isLAN && this.socket) {
            this.socket.on('game_event', (payload) => {
                try {
                    this.handleRemoteGameEvent(payload);
                } catch (e) {
                    console.error('Error manejando evento remoto:', e);
                }
            });
            
            // Listener para cambios de turno
            this.socket.on('turn_changed', (data) => {
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

        this.player.essences = new Set();
        this.opponent.essences = new Set();

        // Añadimos la función 'fillEssence' a las instancias de Player, ya que no está en la clase base.
        const addFillEssence = (playerInstance) => {
            playerInstance.fillEssence = function(essenceType) {
                // Si la esencia no ha sido llenada previamente...
                if (!this.essences.has(essenceType)) {
                    this.essences.add(essenceType); // La añadimos al Set.
                    console.log('[GameScene] Esencia activada', { playerId: this.id, essenceType, total: this.essences.size });
                    // Emitimos un evento para que la UIScene actualice los orbes.
                    this.scene.events.emit('essence-activated', this.id, essenceType);
                } else {
                    console.log('[GameScene] Esencia ya activada previamente', { playerId: this.id, essenceType });
                }
            };
        };

        addFillEssence(this.player);
        addFillEssence(this.opponent);

        this.player.drawInitialHand();
        this.opponent.drawInitialHand();

        // Fondo centrado
        this.board = this.add.video(width / 2, height / 2, 'campo-video')
            .setOrigin(0.5);

        // Enviamos el tablero al fondo de la lista de renderizado.
        this.board.setDepth(-1);

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
            if (this.gameState === 'pre-start') {
                console.log('[GameScene] ¡La partida ha comenzado!', { player: this.playerData?.username || 'Jugador' });
                
                // En modo LAN, solo el host comienza su turno, el guest espera
                if (this.isLAN) {
                    if (this.playerRole === 'host') {
                        this.startPlayerTurn();
                    } else {
                        // El guest espera su turno
                        this.gameState = 'opponent-turn';
                        this.events.emit('update-turn-indicator', 'opponent');
                        console.log('[GameScene] Esperando turno del oponente (eres guest)');
                    }
                } else {
                    // Modo local o vs bot: el jugador siempre empieza
                    this.startPlayerTurn();
                }
            } else {
                console.log('[GameScene] start-game ignorado', { estadoActual: this.gameState });
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
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }
        if (this.playerMustAttackThisTurn) {
            console.log('[GameScene] Estás obligado a atacar este turno. No puedes colocar cartas.');
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

                    // 2. La carta jugada ya no es parte de la mano visual.
                    this['player-cards'] = this['player-cards'].filter(card => card !== this.selectedCard);
                    this.deselectCard(false); // Deseleccionamos sin animar.

                    // 3. Robamos, refrescamos la mano y actualizamos contadores.
                    this.player.drawCard();
                    this.refreshPlayerHand();
                    this.updateDeckCounts();

                            // 4. Marcamos la acción y terminamos el turno.
                    this.playerHasActed = true;
                            console.log('[GameScene] Jugador colocó carta en el campo', { cardId: cardPlayed.id, instanceId: cardPlayed.instanceId, type: cardPlayed.type, level: cardPlayed.level, fieldIndex });
                    // Emitir evento de juego a oponente si estamos en LAN
                        if (this.isLAN && this.socket) {
                        const payload = { 
                            type: 'play_card', 
                            actor: 'player', 
                            playerRole: this.playerRole || null,
                            card: cardPlayed, 
                            fieldIndex 
                        };
                        if (this.debugSync) console.log('[GameScene][debug] emitiendo play_card payload', { payload, timestamp: Date.now() });
                        try {
                            this.socket.emit('game_event', payload);
                        } catch (e) { console.warn('No se pudo emitir evento de juego:', e); }
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
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }
        if (this.playerMustAttackThisTurn) {
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


        // 4. Destruir los objetos visuales.
        const selectedName = selectedCardObject.name;
        const targetName = targetCardObject.name;
        
        selectedCardObject.destroy();
        targetCardObject.destroy();

        console.log('[GameScene] Objetos visuales eliminados tras fusión', { destroyed: [selectedName, targetName], sourceIndex: selIdx, targetIndex: tgtIdx });

        // 5. Crear la nueva carta fusionada (visual) usando helper centralizado.
        const fusedCardObject = this.createFieldCardAt(fusionPosition.x, fusionPosition.y, fusedCardData, { isOpponent: false, revealed: true, fieldIndex: targetIndex });
        // Guardamos también la escala inicial por compatibilidad con animaciones de selección.
        fusedCardObject.setData('startScale', fusedCardObject.scale);
        this.deselectCard(false); // Deseleccionamos sin animación

        // Animación de aparición (fade-in). No cambiamos escala para evitar overflow.
        fusedCardObject.alpha = 0;
        this.tweens.add({
            targets: fusedCardObject,
            alpha: { from: 0, to: 1 },
            duration: 300,
            ease: 'Power2'
        });

        // Consumir la acción y terminar el turno automáticamente.
        this.playerHasActed = true;
        
        // Emitir evento de fusión si estamos en LAN
        if (this.isLAN && this.socket) {
            try {
                this.socket.emit('game_event', {
                    type: 'fuse_cards',
                    actor: 'player',
                    playerRole: this.playerRole || null,
                    sourceIndex: selIdx,
                    targetIndex: tgtIdx,
                    resultCard: fusedCardData
                });
            } catch (e) { console.warn('No se pudo emitir evento de fusión:', e); }
        }
        
        this.deselectCard(false);
        console.log('[GameScene] Carta fusionada creada en campo', { fieldIndex: targetIndex, fusedCard: fusedCardData });
        this.endPlayerTurn();
    }

    /**
     * Intenta fusionar una carta de la mano con una carta en el campo.
     * @param {Card} handCardObject La carta seleccionada de la mano.
     * @param {Card} fieldCardObject La carta objetivo en el campo.
     */
    attemptToFuseFromHand(handCardObject, fieldCardObject) {
        // Bloquear si ya actuó o debe atacar
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }
        if (this.playerMustAttackThisTurn) {
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

        // 3. Destruimos los objetos visuales de las cartas originales.
        const fusionPosition = { x: fieldCardObject.x, y: fieldCardObject.y };
        handCardObject.destroy();
        fieldCardObject.destroy();

        // 4. Creamos el nuevo objeto visual para la carta fusionada usando helper.
        const fusedCardObject = this.createFieldCardAt(fusionPosition.x, fusionPosition.y, fusionResult, { isOpponent: false, revealed: true, fieldIndex: targetIndex });
        fusedCardObject.setData('startScale', fusedCardObject.scale);

        // 5. Limpiamos la selección y refrescamos la mano.
        this.deselectCard(false); // Deseleccionamos sin animación.
        console.log('[GameScene] Carta fusionada (mano->campo) creada', { fieldIndex: targetIndex, fusedCard: fusionResult });

        // Robamos una carta para reponer la que se usó desde la mano.
        this.player.drawCard();
        this.refreshPlayerHand(); // Actualizamos la mano para que se reordene.
        this.updateDeckCounts(); // Actualizamos el contador del mazo.
        // Animación de aparición: fade-in (el helper mantiene el tamaño constante).
        fusedCardObject.alpha = 0;
        this.tweens.add({ targets: fusedCardObject, alpha: { from: 0, to: 1 }, duration: 300, ease: 'Power2' });

        // Consumir acción y emitir evento de fusión desde mano si estamos en LAN
        this.playerHasActed = true;
        if (this.isLAN && this.socket) {
            try {
                this.socket.emit('game_event', {
                    type: 'fuse_from_hand',
                    actor: 'player',
                    playerRole: this.playerRole || null,
                    handCardId: handCardData.instanceId,
                    targetIndex: targetIndex,
                    resultCard: fusionResult
                });
            } catch (e) { console.warn('No se pudo emitir evento de fusión desde mano:', e); }
        }
        this.endPlayerTurn();

        // (No se admite fusiones desde la mano.)
    }

    /**
     * Inicia y ejecuta la lógica del turno del oponente.
     * Esta es un boot muy simple para fines de prueba. (En mejora continua, tendra tres niveles de dificultad.)
     */
    startOpponentTurn() {
        this.gameState = 'opponent-turn';
        let opponentHasActed = false;

        this.opponentTurnNumber++;
        this.opponentHasActed = false;
        this.opponentPerformedAttackThisTurn = false;
        this.opponentMustAttackThisTurn = (this.opponentTurnsSinceLastAttack >= 2);

        // Limpieza bloqueos vencidos y reset consecutiveAttacks si no atacó el turno anterior
        const opponentFieldCardObjects = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField'));
        opponentFieldCardObjects.forEach(cardObj => {
            if (cardObj.getData('lastAttackedTurn') !== (this.opponentTurnNumber - 1)) {
                cardObj.setData('consecutiveAttacks', 0);
            }
            const blocked = cardObj.getData('blockedTurn');
            if (typeof blocked === 'number' && blocked < this.opponentTurnNumber) {
                cardObj.setData('blockedTurn', null);
            }
        });

        // 🎮 EN MODO LAN: No ejecutar IA, solo esperar acciones del oponente remoto
        if (this.isLAN) {
            console.log('[GameScene] Inicio del turno del OPONENTE (LAN) - esperando acción remota', { turnNumber: this.opponentTurnNumber });
            this.events.emit('update-turn-indicator', 'opponent');
            // El oponente jugará desde su cliente, los eventos llegarán por socket
            return;
        }

        // 🤖 MODO BOT: Ejecutar IA del oponente
        console.log('[GameScene] IA del oponente evaluando acciones (BOT)', { turnNumber: this.opponentTurnNumber });

        this.time.delayedCall(this.getBotActionDelay(), () => {
            let acted = false;

            // 1) Intentar fusionar (campo o mano) para avanzar hacia 6 tipos / llenar esencias
            const shouldAttemptFusion = this.shouldBotAttemptFusion();
            if (!acted && shouldAttemptFusion && !this.opponentMustAttackThisTurn) {
                const fusionPlan = this.findBestFusion();
                if (fusionPlan && fusionPlan.kind === 'field') {
                    if (this.debugSync) console.log('[GameScene][debug] Oponente BOT fusionando campo', { indices: fusionPlan.indices, timestamp: Date.now() });
                    const [idxA, idxB] = fusionPlan.indices;

                    // Guardar datos originales antes de modificar el modelo
                    const origA = this.opponent.field[idxA];
                    const origB = this.opponent.field[idxB];

                    const res = this.opponent.fuseCards(idxA, idxB);
                    if (res && res.newCard) {
                        // Determinar índice donde debe quedar la carta fusionada.
                        let targetIndex = null;
                        if (typeof res.emptiedIndex === 'number') {
                            targetIndex = [idxA, idxB].find(i => i !== res.emptiedIndex);
                        } else if (typeof res.targetIndex === 'number') {
                            targetIndex = res.targetIndex;
                        } else {
                            targetIndex = idxB; // fallback
                        }

                        // Destruir de forma robusta LOS DOS objetos visuales originales
                        // (buscar por instanceId para evitar solapamientos / duplicados)
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

                        // Asegurar que no quede ningún objeto visual en el slot destino antes de crear la nueva carta
                        const existing = this.findCardObjectOnField(targetIndex);
                        if (existing && existing.getData('isOpponentCard')) existing.destroy();

                        // Crear UNA sola carta fusionada en el slot correcto y dejarla revelada.
                        const slotObj = this['opponent_battle_slots'][targetIndex];
                        const fusedObj = this.createFieldCard(slotObj, res.newCard, { isOpponent: true, revealed: true, fieldIndex: targetIndex });
                        // Asegurar textura frontal por si el constructor de Card no la aplicó automáticamente
                        try { fusedObj.setTexture(`card-${res.newCard.type}-${res.newCard.level}`); } catch (e) {}

                        acted = true;
                        // Fusión de campo NO cambia la mano/mazo -> no drawCard aquí.
                        this.refreshOpponentHand();
                        this.updateDeckCounts();

                        this.endOpponentTurn(true);
                        return;
                    }
                } else if (fusionPlan && fusionPlan.kind === 'hand') {
                    if (this.debugSync) console.log('[GameScene][debug] Oponente BOT fusionando desde mano', { handInstanceId: fusionPlan.handInstanceId, targetIndex: fusionPlan.targetIndex, timestamp: Date.now() });
                    const fused = this.opponent.fuseFromHand(fusionPlan.handInstanceId, fusionPlan.targetIndex);
                    if (fused) {
                        const slotObj = this['opponent_battle_slots'][fusionPlan.targetIndex];
                        const fusedObj = this.createFieldCard(slotObj, fused, { isOpponent: true, revealed: true, fieldIndex: fusionPlan.targetIndex });
                        try { fusedObj.setTexture(`card-${fused.type}-${fused.level}`); } catch (e) {}
                        acted = true;
                        this.opponent.drawCard();
                        this.refreshOpponentHand();
                        this.updateDeckCounts();
                        this.endOpponentTurn(true);
                        return;
                    }
                }
            }

            // 2) Evaluar ataques calculados
            if (!acted) {
                const bestAttack = this.findBestAttack();
                const availableAttackers = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField') && c.getData('blockedTurn') !== this.opponentTurnNumber);

                // Forzar ataques si obligado y no hay defensas => ataque directo para esencias
                const playerHasField = this.player.field.some(c => c !== null);
                if (this.opponentMustAttackThisTurn && availableAttackers.length > 0 && !playerHasField) {
                    if (this.debugSync) console.log('[GameScene][debug] Oponente BOT ataque directo (obligado)', { attackerCount: availableAttackers.length, timestamp: Date.now() });
                    const attacker = Phaser.Math.RND.pick(availableAttackers);
                    this.revealOpponentCard(attacker);
                    this._registerCardAttack(attacker, 'opponent');
                    this.opponent.fillEssence(attacker.getData('cardData').type);
                    acted = true;
                    this.endOpponentTurn(true);
                    return;
                }

                // Si está obligado y hay un bestAttack -> ejecutar
                if (this.opponentMustAttackThisTurn && bestAttack) {
                    if (this.debugSync) console.log('[GameScene][debug] Oponente BOT ataque calculado (obligado)', { attackerIndex: bestAttack.attacker.index, defenderIndex: bestAttack.defender.index, score: bestAttack.score, timestamp: Date.now() });
                    const attackerObj = this.children.list.find(c => c.getData('isOpponentCard') && c.getData('fieldIndex') === bestAttack.attacker.index);
                    const defenderObj = this.children.list.find(c => !c.getData('isOpponentCard') && c.getData('fieldIndex') === bestAttack.defender.index);
                    if (attackerObj && defenderObj && attackerObj.getData('blockedTurn') !== this.opponentTurnNumber) {
                        this.revealOpponentCard(attackerObj);
                        const res = resolveCombat(attackerObj.getData('cardData'), defenderObj.getData('cardData'));
                        this._registerCardAttack(attackerObj, 'opponent');
                        this.tweens.add({
                            targets: attackerObj, x: defenderObj.x, y: defenderObj.y, duration: 200, yoyo: true, ease: 'Power1',
                            onComplete: () => {
                                if (res.loser === 'attacker') this.destroyCard(this.opponent, attackerObj.getData('fieldIndex'));
                                else if (res.loser === 'defender') this.destroyCard(this.player, defenderObj.getData('fieldIndex'));
                                acted = true;
                                this.opponentPerformedAttackThisTurn = true;
                                this.endOpponentTurn(true);
                            }
                        });
                        return;
                    }
                }

                // Si no obligado, atacar solo si score cumple el threshold de dificultad
                const attackThreshold = this.getBotAttackThreshold();
                if (!this.opponentMustAttackThisTurn && bestAttack && bestAttack.score >= attackThreshold) {
                    if (this.debugSync) console.log('[GameScene][debug] Oponente BOT ataque calculado (opcional)', { attackerIndex: bestAttack.attacker.index, defenderIndex: bestAttack.defender.index, score: bestAttack.score, timestamp: Date.now() });
                    const attackerObj = this.children.list.find(c => c.getData('isOpponentCard') && c.getData('fieldIndex') === bestAttack.attacker.index);
                    const defenderObj = this.children.list.find(c => !c.getData('isOpponentCard') && c.getData('fieldIndex') === bestAttack.defender.index);
                    if (attackerObj && defenderObj && attackerObj.getData('blockedTurn') !== this.opponentTurnNumber) {
                        this.revealOpponentCard(attackerObj);
                        const res = resolveCombat(attackerObj.getData('cardData'), defenderObj.getData('cardData'));
                        this._registerCardAttack(attackerObj, 'opponent');
                        this.tweens.add({
                            targets: attackerObj, x: defenderObj.x, y: defenderObj.y, duration: 200, yoyo: true, ease: 'Power1',
                            onComplete: () => {
                                if (res.loser === 'attacker') this.destroyCard(this.opponent, attackerObj.getData('fieldIndex'));
                                else if (res.loser === 'defender') this.destroyCard(this.player, defenderObj.getData('fieldIndex'));
                                acted = true;
                                this.opponentPerformedAttackThisTurn = true;
                                this.endOpponentTurn(true);
                            }
                        });
                        return;
                    }
                }

                // Si obligado y no hay opciones calculadas -> ataque aleatorio forzado
                if (this.opponentMustAttackThisTurn && availableAttackers.length > 0) {
                    const defenders = this.children.list.filter(c => !c.getData('isOpponentCard') && c.getData('isCardOnField'));
                    if (defenders.length === 0) {
                        // ataque directo
                        if (this.debugSync) console.log('[GameScene][debug] Oponente BOT ataque directo aleatorio (obligado)', { attackerCount: availableAttackers.length, timestamp: Date.now() });
                        const atk = Phaser.Math.RND.pick(availableAttackers);
                        if (atk) {
                            this.revealOpponentCard(atk);
                            this._registerCardAttack(atk, 'opponent');
                            this.opponent.fillEssence(atk.getData('cardData').type);
                            acted = true;
                            this.endOpponentTurn(true);
                            return;
                        }
                    } else {
                        if (this.debugSync) console.log('[GameScene][debug] Oponente BOT ataque aleatorio (obligado)', { attackerCount: availableAttackers.length, defenderCount: defenders.length, timestamp: Date.now() });
                        const atk = Phaser.Math.RND.pick(availableAttackers);
                        const def = Phaser.Math.RND.pick(defenders);
                        this.revealOpponentCard(atk);
                        this.revealPlayerCard(def);
                        const res = resolveCombat(atk.getData('cardData'), def.getData('cardData'));
                        this._registerCardAttack(atk, 'opponent');
                        this.tweens.add({
                            targets: atk, x: def.x, y: def.y, duration: 200, yoyo: true, ease: 'Power1',
                            onComplete: () => {
                                if (res.loser === 'attacker') this.destroyCard(this.opponent, atk.getData('fieldIndex'));
                                else if (res.loser === 'defender') this.destroyCard(this.player, def.getData('fieldIndex'));
                                acted = true;
                                this.opponentPerformedAttackThisTurn = true;
                                this.endOpponentTurn(true);
                            }
                        });
                        return;
                    }
                }
            }

            // 3) Intentar jugar carta que cubra tipos faltantes o simplemente ocupar
            if (!acted && !this.opponentMustAttackThisTurn) {
                const emptySlots = this.opponent.field.map((s,i) => s === null ? i : -1).filter(i => i !== -1);
                if (emptySlots.length > 0 && this.opponent.hand.length > 0) {
                    const missingTypes = (() => {
                        const types = new Set(this.opponent.field.filter(c => c).map(c => c.type));
                        return Object.values(CardDefinitions).filter(d => d.level === 1).map(d => d.type).filter(t => !types.has(t));
                    })();
                    let pickIdx = null;
                    if (missingTypes.length > 0) {
                        const candidate = this.opponent.hand.find(c => missingTypes.includes(c.type));
                        if (candidate) pickIdx = this.opponent.hand.indexOf(candidate);
                    }
                    if (pickIdx === null) pickIdx = 0;
                    const cardToPlay = this.opponent.hand[pickIdx];
                    const slotIndex = Phaser.Math.RND.pick(emptySlots);
                    if (this.debugSync) console.log('[GameScene][debug] Oponente BOT jugando carta', { cardInstanceId: cardToPlay.instanceId, slotIndex, timestamp: Date.now() });
                    const played = this.opponent.playCardFromHand(cardToPlay.instanceId, slotIndex);
                    if (played) {
                        const slotObj = this['opponent_battle_slots'][slotIndex];
                        const newCardObj = this.createFieldCard(slotObj, played, { isOpponent: true, revealed: false, fieldIndex: slotIndex });
                        this.opponent.drawCard();
                        this.refreshOpponentHand();
                        this.updateDeckCounts();
                        acted = true;
                        this.endOpponentTurn(true);
                        return;
                    }
                }
            }

            // 4) Si no hizo nada -> terminar turno
            this.endOpponentTurn(acted);
        });
    }

    /**
     * --- ¡NUEVA FUNCIÓN DE IA! ---
     * Analiza todos los posibles ataques y devuelve el mejor según un sistema de puntuación.
     * @returns {object|null} El mejor objeto de ataque o null si no hay ataques posibles.
     */
    findBestAttack() {
        // La IA ya no mira el modelo de datos del jugador. Ahora busca los objetos visuales en el tablero.
        const opponentCardObjects = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField') && (c.getData('cooldown') || 0) === 0);
        const playerCardObjects = this.children.list.filter(c => !c.getData('isOpponentCard') && c.getData('isCardOnField'));

        if (opponentCardObjects.length === 0 || playerCardObjects.length === 0) {
            return null;
        }

        // Sólo cartas reveladas del jugador
        const revealedPlayerCards = playerCardObjects.filter(c => c.getData('isRevealed'));

        // sólo atacantes válidos (cooldown 0) ya filtrado + defenderes revelados
        const opponentCards = opponentCardObjects.map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));
        const playerCards = revealedPlayerCards.map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));

        if (playerCards.length === 0) return null;

        let bestAttack = { score: -100 };
        for (const attacker of opponentCards) {
            for (const defender of playerCards) {
                let currentScore = 0;
                const result = resolveCombat(attacker.card, defender.card);

                if (result.winner === 'attacker') {
                    currentScore += 10 + defender.card.level * 2;
                } else {
                    currentScore -= 10;
                    if (result.loser === 'attacker') currentScore -= attacker.card.level * 3;
                }

                // Aplicar modificador de dificultad
                currentScore += this.getBotAttackScoreModifier();

                if (currentScore > bestAttack.score) {
                    bestAttack = { attacker, defender, score: currentScore };
                }
            }
        }

        return bestAttack.score > 0 ? bestAttack : null;
    }

    /**
     * --- NUEVA FUNCIÓN: encontrar mejor fusión para la IA del oponente ---
     * Analiza todas las posibles fusiones que puede realizar el oponente y devuelve la más beneficiosa.
     * Priorizando aquellas que liberen espacio en el campo o que mejoren el nivel de las cartas.
     * @returns {object|null} Un objeto con la información de la fusión óptima o null si no hay fusiones posibles.
     */
    findBestFusion() {
        // Prioriza fusiones en campo que liberen slots o aumenten nivel útilmente.
        const myField = this.opponent.field;
        const samePairs = [];
        for (let i = 0; i < myField.length; i++) {
            for (let j = i + 1; j < myField.length; j++) {
                const a = myField[i], b = myField[j];
                if (a && b && a.type === b.type && a.level === b.level && a.level < 3) {
                    samePairs.push({ i, j, level: a.level, type: a.type });
                }
            }
        }

        // Si faltan tipos únicos, priorizar hacer espacio (fusionar duplicados).
        const currentTypes = new Set(myField.filter(c => c).map(c => c.type));
        const needed = Object.values(CardDefinitions).filter(d => d.level === 1).map(d => d.type).filter(t => !currentTypes.has(t));

        if (samePairs.length > 0 && (needed.length > 0 || this.opponent.hand.length === 0)) {
            samePairs.sort((a,b) => a.level - b.level);
            return { kind: 'field', indices: [samePairs[0].i, samePairs[0].j] };
        }

        // Quitar fusión desde la mano: sólo permitimos fusiones entre cartas del campo (regla).
        return null;
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
        this.gameState = 'player-turn';

        // Incremento del contador de turns del jugador y reseteo de flags
        this.playerTurnNumber++;
        this.playerHasActed = false; // Permitir 1 acción en este turno
        this.playerPerformedAttackThisTurn = false;

        // Si en dos turns previos no atacó -> ahora debe atacar
        this.playerMustAttackThisTurn = (this.playerTurnsSinceLastAttack >= 2);

        console.log('[GameScene] Inicio del turno del JUGADOR', { turnNumber: this.playerTurnNumber, mustAttack: this.playerMustAttackThisTurn });
        this.events.emit('update-turn-indicator', 'player');
        // Emitimos el estado del contador obligatorio para que la UI lo muestre
        this.events.emit('update-attack-counter', 'player', this.playerTurnsSinceLastAttack + 1, this.playerMustAttackThisTurn);

        // Procesar cooldowns de las cartas del jugador al inicio de su turno
        const playerFieldCardObjects = this.children.list.filter(c => c.getData('isCardOnField') && !c.getData('isOpponentCard'));
        playerFieldCardObjects.forEach(cardObj => {
            let cooldown = cardObj.getData('cooldown') || 0;
            if (cooldown > 0) {
                cooldown = Math.max(0, cooldown - 1);
                cardObj.setData('cooldown', cooldown);
            }
            // Si no atacó en turno previo, y no hay cooldown, reset de consecutiveAttacks
            if (cardObj.getData('lastAttackedTurn') !== (this.playerTurnNumber - 1)) {
                cardObj.setData('consecutiveAttacks', 0);
            }
        });

        // --- TEMPORIZADOR REDUCIDO A 12s ---
        if (this.turnTimer) this.turnTimer.destroy();
        this.turnTimer = this.time.addEvent({
            delay: 12000, // 12 segundos (regla 15)
            callback: this._playerTimedOut,
            callbackScope: this
        });

        // Si está obligado a atacar y NO tiene cartas en campo: saltar el turno y reiniciar contador.
        const playerHasFieldCards = this.player.field.some(c => c !== null);
        if (this.playerMustAttackThisTurn && !playerHasFieldCards) {
                console.log('[GameScene] Obligado a atacar pero no tiene cartas -> salto de turno automático', { playerTurnsSinceLastAttack: this.playerTurnsSinceLastAttack });
            this.playerTurnsSinceLastAttack = 0;
            this.endPlayerTurn();
            return;
        }
    }

    // Nuevo helper cuando se queda sin tiempo
    _playerTimedOut() {
        console.log('[GameScene] Tiempo agotado: el jugador no actuó en el turno', { turnNumber: this.playerTurnNumber });
        // Si estaba obligado a atacar y tenía cartas, se considera que NO atacó:
        // endPlayerTurn() aumentará su contador de turnos sin atacar (no lo reiniciamos).
        this.endPlayerTurn();
    }

    /**
     * Finaliza el turno del jugador, ya sea por tiempo o por acción voluntaria (eliminado).
     */
    endPlayerTurn() {
        if (this.gameState !== 'player-turn') return;
        // Si hay animaciones en curso, solo marcamos el cambio de turno como pendiente.
        if (this.blockingAnimations > 0) { this.pendingTurnChange = 'opponent'; return; }

        console.log('[GameScene] Fin del turno del JUGADOR', { playerHasActed: this.playerHasActed, performedAttack: this.playerPerformedAttackThisTurn, turnNumber: this.playerTurnNumber });

        if (this.turnTimer) this.turnTimer.destroy();
        // Comprobamos inactividad
        if (!this.playerHasActed) {
            this.playerInactiveTurns++;
            console.log('[GameScene] Jugador inactivo', { inactiveTurns: this.playerInactiveTurns });
        } else {
            this.playerInactiveTurns = 0; // Reseteamos si hubo acción
        }

        // Contador de ataques: si NO atacó este turno, incrementamos.
        if (!this.playerPerformedAttackThisTurn) {
            this.playerTurnsSinceLastAttack++;
        } else {
            this.playerTurnsSinceLastAttack = 0;
        }
        this.playerMustAttackThisTurn = false; // reset obligación al finalizar turno
        // Notificamos el contador a la UI
        this.events.emit('update-attack-counter', 'player', this.playerTurnsSinceLastAttack + 1, this.playerMustAttackThisTurn);

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
            try {
                this.socket.emit('end_turn', { playerRole: this.playerRole });
            } catch (e) {
                console.warn('No se pudo emitir fin de turno:', e);
            }
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
        if (this.gameState !== 'opponent-turn') return;

        // Comprobamos inactividad del oponente
        if (!opponentActed) {
            this.opponentInactiveTurns++;
            console.log('[GameScene] Oponente inactivo', { inactiveTurns: this.opponentInactiveTurns });
        } else {
            this.opponentInactiveTurns = 0;
        }

        // Contador de ataques del oponente
        if (!this.opponentPerformedAttackThisTurn) {
            this.opponentTurnsSinceLastAttack++;
        } else {
            this.opponentTurnsSinceLastAttack = 0;
        }
        this.opponentMustAttackThisTurn = false;
        this.events.emit('update-attack-counter', 'opponent', this.opponentTurnsSinceLastAttack + 1, this.opponentMustAttackThisTurn);

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
        if (this.gameState === 'player-turn' && this.turnTimer) {
            // Usamos getProgress() para tener un valor de 0 a 1 y lo multiplicamos por el total.
            // Math.ceil asegura que el último segundo se muestre como '1' en lugar de '0'.
            const remainingTime = Math.ceil((1 - this.turnTimer.getProgress()) * 12);
            // Emitimos un evento para que la UI actualice el contador
            this.events.emit('update-timer', remainingTime);
        } else if (this.gameState !== 'game-over') {
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
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }

        // Restricción por nivel: comprobar blockedTurn en lugar de solo cooldown
        const blocked = attackingCardObject.getData('blockedTurn');
        if (blocked === this.playerTurnNumber) {
            console.log('[GameScene] Esta carta está descansando este turno (restricción por nivel).');
            return;
        }

        // Unificamos el acceso a los datos de las cartas.
        const attackerData = attackingCardObject.getData('cardData');
        const defenderData = defendingCardObject.getData('cardData');

        this.playerHasActed = true; // Consume la acción del jugador
        this.playerPerformedAttackThisTurn = true;
        this.playerTurnsSinceLastAttack = 0; // Reiniciamos contador de ataques

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
            try {
                this.socket.emit('game_event', {
                    type: 'attack',
                    actor: 'player',
                    playerRole: this.playerRole || null,
                    attackerIndex: attackingCardObject.getData('fieldIndex'),
                    defenderIndex: defendingCardObject.getData('fieldIndex'),
                    result: result
                });
            } catch (e) { console.warn('No se pudo emitir evento de ataque:', e); }
        }

        this.animateAttack(attackingCardObject, defendingCardObject, result);
    }

    /**
     * Gestiona un ataque directo al oponente cuando no tiene cartas en el campo.
     * @param {Phaser.GameObjects.Image} attackingCardObject La carta que ataca.
     */
    handleDirectAttack(attackingCardObject) {
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('[GameScene] Ya realizaste tu acción este turno.');
            return;
        }

        const blocked = attackingCardObject.getData('blockedTurn');
        if (blocked === this.playerTurnNumber) {
            console.log('[GameScene] Esta carta está descansando este turno (restricción por nivel).');
            return;
        }

        const attackerData = attackingCardObject.cardData || attackingCardObject.getData('cardData');
        this.playerHasActed = true;
        this.playerPerformedAttackThisTurn = true;
        this.playerTurnsSinceLastAttack = 0;

        console.log('[GameScene] Jugador realiza ataque directo', { attackerType: attackerData.type, attackerIndex: attackingCardObject.getData('fieldIndex') });

        // Llenamos la esencia del jugador
        this.player.fillEssence(attackerData.type);

        // Marcar la carta como revelada (ataca)
        this.revealPlayerCard(attackingCardObject);

        // Registrar cooldown / consecutive attacks
        this._registerCardAttack(attackingCardObject, 'player');

        // Emitir evento de ataque directo si estamos en LAN
        if (this.isLAN && this.socket) {
            try {
                this.socket.emit('game_event', {
                    type: 'direct_attack',
                    actor: 'player',
                    playerRole: this.playerRole || null,
                    attackerIndex: attackingCardObject.getData('fieldIndex'),
                    essenceType: attackerData.type
                });
            } catch (e) { console.warn('No se pudo emitir evento de ataque directo:', e); }
        }

        // Animamos el ataque (hacia el centro)
        const targetPos = { x: this.scale.width / 2, y: this['opponent_battle_slots'][0].y };
        this.animateAttack(attackingCardObject, targetPos, { winner: 'attacker', loser: 'none' });
    }

    animateAttack(attackingCardObject, target, result) {
        this.blockingAnimations++;
        console.log('[GameScene] Animación de ataque iniciada. Bloqueos activos:', this.blockingAnimations);
        this.tweens.add({
            targets: attackingCardObject,
            x: target.x, // Corregido: usar 'target.x'
            y: target.y, // Corregido: usar 'target.y'
            duration: 200,
            yoyo: true, // La carta vuelve a su posición original
            ease: 'Power1',
            onComplete: () => {
                this.deselectCard(true); // asegurar que vuelva a startPosition tras el ataque
                console.log('[GameScene] animateAttack local complete, result:', result, { attackerFieldIndex: attackingCardObject.getData('fieldIndex'), target });
                // Determinar owner del atacante según metadata visual
                const attackerIsOpponent = !!attackingCardObject.getData('isOpponentCard');
                const attackerOwner = attackerIsOpponent ? this.opponent : this.player;
                // Si el target es un objeto visual de carta, determinar su owner
                let defenderOwner = null;
                let defenderFieldIndex = null;
                if (target && typeof target.getData === 'function') {
                    const defenderIsOpponent = !!target.getData('isOpponentCard');
                    defenderOwner = defenderIsOpponent ? this.opponent : this.player;
                    defenderFieldIndex = target.getData('fieldIndex');
                }

                if (result.loser === 'attacker') {
                    const idx = attackingCardObject.getData('fieldIndex');
                    console.log('[GameScene] animateAttack: destruyendo atacante', { owner: attackerOwner.id, idx });
                    this.destroyCard(attackerOwner, idx);
                } else if (result.loser === 'defender' && defenderOwner && typeof defenderFieldIndex === 'number') {
                    console.log('[GameScene] animateAttack: destruyendo defensor', { owner: defenderOwner.id, idx: defenderFieldIndex });
                    this.destroyCard(defenderOwner, defenderFieldIndex);
                }

                // Tras el ataque, el turno del jugador termina automáticamente
                this.endPlayerTurn();
                this._animationComplete();
            }
        });
    }

    /**
     * Comprueba todas las condiciones de victoria al final de un turno.
     * @returns {string|null} 'player', 'opponent' o null.
     */
    checkVictoryConditions() {
        // Condición 1: Derrota por inactividad
        if (this.playerInactiveTurns >= 3) {
            console.log('[GameScene] VICTORIA: OPONENTE (inactividad del jugador)');
            return 'opponent';
        }
        if (this.opponentInactiveTurns >= 3) {
            console.log('[GameScene] VICTORIA: JUGADOR (inactividad del oponente)');
            return 'player';
        }

        // Condición 2: Victoria por control de campo (6 tipos únicos)
        const playerFieldTypes = new Set(this.player.field.filter(c => c).map(c => c.type));
        if (playerFieldTypes.size === 6) {
            console.log('[GameScene] VICTORIA: JUGADOR (control de campo - 6 tipos)');
            return 'player';
        }
        const opponentFieldTypes = new Set(this.opponent.field.filter(c => c).map(c => c.type));
        if (opponentFieldTypes.size === 6) {
            console.log('[GameScene] VICTORIA: OPONENTE (control de campo - 6 tipos)');
            return 'opponent';
        }

        // Condición 3: Victoria por llenar las 6 esencias
        if (this.player.essences.size === 6) {
            console.log('[GameScene] VICTORIA: JUGADOR (llenó las 6 esencias)');
            return 'player';
        }
        if (this.opponent.essences.size === 6) {
            console.log('[GameScene] VICTORIA: OPONENTE (llenó las 6 esencias)');
            return 'opponent';
        }

        return null; // No hay ganador todavía
    }

    /**
     * Finaliza la partida y muestra un mensaje de victoria/derrota.
     * @param {string} winner El ganador de la partida ('player' u 'opponent').
     */
    endGame(winner) {
        this.gameState = 'game-over';
        if (this.turnTimer) this.turnTimer.destroy();
        this.events.emit('update-timer', 0); // Limpia el contador en la UI
        // No hay botón de terminar turno ahora.

        console.log('[GameScene] Fin de la partida. Ganador:', winner);

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
            if (cardData.level === 2) {
                owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1` });
                owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1-b` });
            } else if (cardData.level === 3) {
                for (let i = 0; i < 4; i++) owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1-${i}` });
            } else owner.addCardDataToGraveyard(cardData);

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

            this.blockingAnimations++;
            console.log('[GameScene] Animación de destrucción iniciada. Bloqueos activos:', this.blockingAnimations);
            console.log('[GameScene] destroyCard: iniciando efecto de partículas para destrucción', { owner: owner.id, fieldIndex, instanceId: finalInstanceId });

            // Hacemos la carta original invisible para que solo se vean las partículas.
            cardObject.setVisible(false);

            // En Phaser 3.60+, this.add.particles() crea directamente un emisor de partículas.
            // Ya no se devuelve un manager ni se usa createEmitter.
            const particles = this.add.particles(
                cardObject.x,
                cardObject.y,
                cardObject.texture.key,
            {
                speed: { min: 50, max: 200 }, // Las partículas se dispersan a diferentes velocidades.
                angle: { min: 0, max: 360 }, // Se dispersan en todas las direcciones.
                scale: { start: 0.1, end: 0 }, // Empiezan a la mitad de su tamaño y se encogen hasta desaparecer.
                alpha: { start: 1, end: 0 }, // Se desvanecen.
                lifespan: 600, // Viven por 600ms.
                blendMode: 'SCREEN', // Un modo de mezcla que se ve bien para efectos de energía/desintegración.
                emitting: false // No empieza a emitir partículas constantemente.
            });

            // Le decimos al emisor que explote una vez en su posición.
            particles.explode(40);

            // Después de un tiempo, destruimos tanto la carta original como el sistema de partículas.
            this.time.delayedCall(1000, () => { // Esperamos 1 segundo para que el efecto termine.
                console.log('[GameScene] destroyCard: Limpiando objeto visual y partículas', { name: cardObject.name, fieldIndex });
                if (cardObject && cardObject.destroy) cardObject.destroy();
                if (particles) particles.destroy(); // Muy importante destruir el gestor de partículas para liberar memoria.
                visualDestroyed = true;
                this._animationComplete();
                tryFinalize();
            });
        }

        // Si tenemos modelo, mover a cementerio con la misma lógica previa
        if (cardData) {
            if (cardData.level === 2) {
                owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1` });
                owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1-b` });
            } else if (cardData.level === 3) {
                for (let i = 0; i < 4; i++) owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1-${i}` });
            } else owner.addCardDataToGraveyard(cardData);
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
        const isOpponentAction = isRemotePlayer && this.gameState === 'opponent-turn';
        
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
                    this.opponentHasActed = true;
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
                    if (this.debugSync) console.log('[GameScene][debug] slot visual after remote fuse_cards', { created: fusedObj && fusedObj.getData && fusedObj.getData('instanceId'), slotIndex: targetIndex, timestamp: Date.now() });
                }
                
                // En LAN, marcar que el oponente actuó
                if (isOpponentAction) {
                    this.opponentHasActed = true;
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
                    if (this.debugSync) console.log('[GameScene][debug] slot visual after remote fuse_from_hand', { created: fusedObj && fusedObj.getData && fusedObj.getData('instanceId'), slotIndex: targetIndex, timestamp: Date.now() });
                }
                
                // Actualizar mano del oponente
                this.refreshOpponentHand();
                
                // En LAN, marcar que el oponente actuó
                if (isOpponentAction) {
                    this.opponentHasActed = true;
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
                    this.opponentHasActed = true;
                    this.opponentPerformedAttackThisTurn = true;
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
                                this.opponentHasActed = true;
                                this.opponentPerformedAttackThisTurn = true;
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

    // Nuevo helper para aplicar cooldowns y contabilizar ataques por nivel
    _registerCardAttack(cardObject, ownerType) {
        const cardData = cardObject.getData('cardData') || cardObject.cardData;
        const level = cardData.level || 1;
        const nowTurn = ownerType === 'player' ? this.playerTurnNumber : this.opponentTurnNumber;

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
        this.blockingAnimations = Math.max(0, this.blockingAnimations - 1);
        console.log('[GameScene] Animación completada. Bloqueos restantes:', this.blockingAnimations);

        // Si no hay más animaciones y hay un cambio de turno pendiente...
        if (this.blockingAnimations === 0 && this.pendingTurnChange) {
            console.log(`[GameScene] Todas las animaciones completadas. Procediendo al turno de: ${this.pendingTurnChange}`);
            const nextTurn = this.pendingTurnChange;
            this.pendingTurnChange = null; // Limpiamos el flag
            if (nextTurn === 'player') this.endOpponentTurn();
            else if (nextTurn === 'opponent') this.endPlayerTurn();
        }
    }

    /**
     * --- SISTEMA DE DIFICULTAD DEL BOT ---
     * Determina si el bot debe intentar fusionar según su nivel de dificultad.
     * @returns {boolean}
     */
    shouldBotAttemptFusion() {
        switch (this.botDifficulty) {
            case 1: // Muy Fácil - Nunca fusiona
                return false;
            case 2: // Fácil - 20% de probabilidad
                return Math.random() < 0.2;
            case 3: // Normal - 40% de probabilidad
                return Math.random() < 0.4;
            case 4: // Difícil - 80% de probabilidad
                return Math.random() < 0.8;
            case 5: // Muy Difícil - Siempre intenta fusionar
                return true;
            case 6: // Experto - Siempre fusiona + bonus estratégico
                return true;
            case 7: // Maestro - Siempre fusiona + predicción
                return true;
            case 8: // Gran Maestro - Siempre fusiona + contrajuego
                return true;
            case 9: // Leyenda - Siempre fusiona + perfección
                return true;
            case 10: // Mito - Siempre fusiona + omnisciencia
                return true;
            default:
                return Math.random() < 0.4;
        }
    }

    /**
     * Determina el threshold de puntuación de ataque según la dificultad del bot.
     * Cuanto más bajo el threshold, más fácilmente el bot decide atacar.
     * @returns {number}
     */
    getBotAttackThreshold() {
        switch (this.botDifficulty) {
            case 6: // Experto - Ataca si score >= -1 (muy agresivo)
                return -1;
            case 7: // Maestro - Ataca si score >= -2 (extremadamente agresivo)
                return -2;
            case 8: // Gran Maestro - Ataca si score >= -3 (riesgoso pero preciso)
                return -3;
            case 9: // Leyenda - Ataca si score >= -5 (juega con pérdidas calculadas)
                return -5;
            case 10: // Mito - Ataca siempre (sin threshold)
                return -10;
            case 1: // Muy Fácil - Ataca solo si score >= 10 (muy restrictivo)
                return 10;
            case 2: // Fácil - Ataca si score >= 7
                return 7;
            case 3: // Normal - Ataca si score >= 5
                return 5;
            case 4: // Difícil - Ataca si score >= 3
                return 3;
            case 5: // Muy Difícil - Ataca si score >= 0 (casi siempre)
                return 0;
            default:
                return 5;
        }
    }

    /**
     * Determina si el bot debe colocar cartas estratégicamente según su nivel.
     * Devuelve el tiempo de espera (delay) antes de ejecutar la acción.
     * @returns {number} Delay en milisegundos
     */
    getBotActionDelay() {
        switch (this.botDifficulty) {
            case 6: // Experto - Delay muy corto pero variable (parece pensativo)
                return Phaser.Math.Between(200, 400);
            case 7: // Maestro - Delay mínimo (decisiones rápidas)
                return Phaser.Math.Between(150, 300);
            case 8: // Gran Maestro - Delay casi instantáneo
                return Phaser.Math.Between(100, 200);
            case 9: // Leyenda - Delay instantáneo (decisiones perfectas)
                return 50;
            case 10: // Mito - Sin delay (omnisciente)
                return 0;
            case 1: // Muy Fácil - Delay largo (parece lento/indeciso)
                return Phaser.Math.Between(1500, 2500);
            case 2: // Fácil - Delay medio-largo
                return Phaser.Math.Between(1000, 1800);
            case 3: // Normal - Delay medio
                return 800;
            case 4: // Difícil - Delay corto (rápido)
                return Phaser.Math.Between(400, 700);
            case 5: // Muy Difícil - Delay muy corto (casi inmediato)
                return 300;
            default:
                return 800;
        }
    }

    /**
     * Obtiene un modificador de puntuación de ataque según la dificultad.
     * Algunos niveles pueden hacer errores estratégicos.
     * @returns {number}
     */
    getBotAttackScoreModifier() {
        switch (this.botDifficulty) {
            case 6: // Experto - Bonus estratégico pequeño
                return Phaser.Math.Between(1, 3);
            case 7: // Maestro - Bonus estratégico medio
                return Phaser.Math.Between(2, 5);
            case 8: // Gran Maestro - Bonus estratégico alto
                return Phaser.Math.Between(3, 7);
            case 9: // Leyenda - Bonus estratégico muy alto
                return Phaser.Math.Between(5, 10);
            case 10: // Mito - Bonus máximo (perfecto)
                return 10;
            case 1: // Muy Fácil - Agrega ruido aleatorio al score (puede atacar mal)
                return Phaser.Math.Between(-15, -5);
            case 2: // Fácil - Pequeño ruido negativo
                return Phaser.Math.Between(-3, 0);
            case 3: // Normal - Sin modificador
                return 0;
            case 4: // Difícil - Pequeño modificador positivo
                return Phaser.Math.Between(0, 2);
            case 5: // Muy Difícil - Sin modificador (juego perfecto)
                return 0;
            default:
                return 0;
        }
    }
}