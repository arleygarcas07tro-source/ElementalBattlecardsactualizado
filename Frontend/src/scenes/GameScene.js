import Phaser from 'phaser';
import { recordCollectedCard } from '../helpers/playerProgress.js';
import { GAME_CONFIG } from '../helpers/constants.js';
import GameComposer from '../app/GameComposer.js';
import BoardRenderer from '../presentation/BoardRenderer.js';
import CardInteraction from '../presentation/CardInteraction.js';
import AttackController from '../presentation/AttackController.js';
import BotTurnRunner from '../presentation/BotTurnRunner.js';
import RemoteEffectApplier from '../presentation/RemoteEffectApplier.js';
import TurnController from '../presentation/TurnController.js';
import { createArena } from '../helpers/battlefieldArt.js';
import { createBattleLayout } from '../helpers/battleLayout.js';
import BattlefieldBombs from '../helpers/battlefieldBombs.js';
import { getGemRequirements } from '../game/objectivesCatalog.js';
import { getGameMode } from '../game/gameModes.js';

/**
 * Escena principal del juego de cartas.
 *
 * Responsabilidad agregada (tras el split): actuar como coordinador delgado.
 * No contiene reglas de dominio ni detalles de pintado; construye el contexto
 * compartido y delega en las clases de presentaciÃ³n:
 *  - BoardRenderer      â†’ objetos visuales del tablero/manos/mazos/efectos.
 *  - CardInteraction    â†’ selecciÃ³n, jugar carta, fusiÃ³n y ataque del jugador.
 *  - BotTurnRunner      â†’ turno del bot (contexto + ejecuciÃ³n del plan de IA).
 *  - RemoteEffectApplierâ†’ efectos de eventos LAN sobre el tablero.
 *  - TurnController     â†’ flujo de turnos, temporizador, victoria y fin de partida.
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerData = null; // Propiedad para guardar los datos del jugador
        this.socket = null;
        this.isLAN = false;
        this.roomCode = null;
        this.playerRole = null; // 'host' o 'guest' en modo LAN
        // Activar logs de sincronizaciÃ³n cuando sea necesario
        this.debugSync = true;
        this.gameStartData = null; // Datos de inicio del juego en modo LAN
        this.vsBot = false;
        this.gameMode = getGameMode('clasico');
        this.gemRequirements = null;
        // TamaÃ±os visuales fijos para normalizar tamaÃ±o real de todas las texturas
        this.cardHandSize = { width: 148, height: 198 }; // tamaÃ±o visual en mano propia
        this.cardOpponentHandSize = { width: 132, height: 176 }; // mano rival (no tapa el perfil)
        this.cardFieldSize = { width: 128, height: 172 }; // tamaÃ±o visual en campo / fusiones
        this.selectionFeedback = []; // Highlights/marcadores temporales de la selecciÃ³n

        // Motor de partida (dominio). Se construye en create() y posee a los
        // jugadores y el flujo de turnos; la escena solo los referencia.
        this.match = null;
        this.turn = null; // Alias de this.match.turn para el resto de la escena.
    }

    /**
     * El mÃ©todo init se ejecuta antes que create y es ideal para recibir datos.
     * @param {object} data - Datos pasados desde la escena anterior.
     */
    init(data) {
        data = data || {};
        // data puede contener: playerData, socket, isLAN, roomCode, vsBot, playerRole, gameStartData, botDifficulty
        this.playerData = data.playerData || data;
        this.socket = data.socket || null;
        this.isLAN = !!data.isLAN;
        this.roomCode = data.roomCode || null;
        this.playerRole = data.playerRole || null;
        this.gameStartData = data.gameStartData || null;
        this.earlyGameStart = data.earlyGameStart || null;
        this.vsBot = !!data.vsBot;
        this.bot = GameComposer.createBot({ difficulty: data.botDifficulty || 3 }); // 1-10, default: Normal (3)
        this.gameMode = getGameMode(data.gameMode);
        this.gemRequirements = this.gameMode.usesGems
            ? getGemRequirements(data.botDifficulty || 3)
            : null;
        console.log('GameScene iniciada con los datos del jugador:', this.playerData);
        console.log('Modo LAN:', this.isLAN, 'Rol:', this.playerRole);
        console.log('Dificultad del bot:', this.bot.difficulty, '(1=Muy FÃ¡cil, 10=Mito)');
    }

    preload() {
        // Fondo real de la zona de juego (foto de la arena).
        this.load.image('arena-photo', '/assets/images/campo%20juego/image258.png');

        // Slots (se usan como zonas invisibles de interacción)
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
        document.body.classList.add('game-active');
        // Recalcular layout al redimensionar
        this.scale.off('resize', this._onGameResize, this);
        this.scale.on('resize', this._onGameResize, this);

        // Detener the bombardeo ambiental de una partida anterior.
        if (this.bombs) {
            this.bombs.stop();
            this.bombs = null;
        }

        // Limpieza de objetos visuales de partidas previas (si la escena se reutiliza)
        try {
            // Tomamos una copia porque destroy modifica children.list
            const childrenCopy = this.children ? this.children.list.slice() : [];
            childrenCopy.forEach(child => {
                if (!child) return;
                // Detectar objetos tipo 'Card' por su metadata 'cardData'
                let hasCardData = false;
                try { hasCardData = !!(child.getData && child.getData('cardData')); } catch { hasCardData = false; }

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
                } catch { isBoardOrDeck = false; }

                // Feedback efÃ­mero de la selecciÃ³n / brillo de turno.
                const isFeedbackObj = typeof name === 'string' && (
                    name.startsWith('selection-feedback') || name === 'turn-glow'
                );
                const isBoardDecor = typeof name === 'string' && name.startsWith('board-decor');

                if (hasCardData || isSlot || isBoardOrDeck || isFeedbackObj || isBoardDecor) {
                    try { if (child.destroy) child.destroy(); } catch { /* ignore */ }
                }
            });
        } catch (e) {
            console.warn('[GameScene] Error durante limpieza inicial:', e);
        }

        // Geometría compartida por todos los colaboradores visuales.
        const { width, height } = this.scale;
        this.layout = createBattleLayout(width, height, { usesGems: this.gameMode.usesGems });
        this.cardHandSize = this.layout.cardHand;
        this.cardOpponentHandSize = this.layout.cardOpponentHand;
        this.cardFieldSize = this.layout.cardField;

        // Reset / inicializaciÃ³n por si la escena se reutiliza entre partidas.
        // El motor de partida se construye en el composition root (GameComposer).
        this.match = GameComposer.createMatch({
            config: GAME_CONFIG,
            mode: this.gameMode,
            gemRequirements: this.gemRequirements,
            // Aviso de gema obtenida: la escena solo reenvÃ­a el evento a la UI.
            onGemGained: (ownerId, type, progress) => this.events.emit('gem-collected', ownerId, type, progress)
        });
        this.player = this.match.player;
        this.opponent = this.match.opponent;
        this.turn = this.match.turn;
        this.turn.reset();

        // Contexto compartido por las clases de presentaciÃ³n. Es el Ãºnico punto
        // por el que fluyen las dependencias entre escena, dominio y colaboradores.
        this.ctx = {
            scene: this,
            match: this.match,
            turn: this.turn,
            player: this.player,
            opponent: this.opponent,
            bot: this.bot,
            isLAN: this.isLAN,
            playerRole: this.playerRole,
            socket: this.socket,
            debugSync: this.debugSync,
            playerData: this.playerData,
            gameStartData: this.gameStartData,
            gameMode: this.gameMode,
            lan: null,
            lanRouter: null,
            renderer: null,
            interaction: null,
            attackController: null,
            botRunner: null,
            remoteApplier: null,
            turnController: null
        };

        const renderer = new BoardRenderer(this.ctx, {
            hand: this.cardHandSize,
            field: this.cardFieldSize,
            opponentHand: this.cardOpponentHandSize,
            layout: this.layout
        });
        const interaction = new CardInteraction(this.ctx);
        const attackController = new AttackController(this.ctx);
        const botRunner = new BotTurnRunner(this.ctx);
        const remoteApplier = new RemoteEffectApplier(this.ctx);
        const turnController = new TurnController(this.ctx);
        this.ctx.renderer = renderer;
        this.ctx.interaction = interaction;
        this.ctx.attackController = attackController;
        this.ctx.botRunner = botRunner;
        this.ctx.remoteApplier = remoteApplier;
        this.ctx.turnController = turnController;

        // Puente de eventos del motor (dominio) hacia los eventos de la escena,
        // que es donde UIScene escucha. La escena solo reenvÃ­a, no decide reglas.
        this.match.events.on('essence-activated', (ownerId, essenceType) => this.events.emit('essence-activated', ownerId, essenceType));
        this.match.events.on('convergence-status', (state) => this.events.emit('convergence-status', state));
        this.match.events.on('essence-power-used', (info) => this.events.emit('essence-power-used', info.essenceType, info.name));
        this.match.events.on('gems-spent', (info) => this.events.emit('gems-spent', info));

        // Poderes de esencia: la UIScene emite la solicitud al hacer clic en un
        // orbe propio. La validaciÃ³n de dominio vive en GameMatch.
        this.events.off('request-essence-power');
        this.events.on('request-essence-power', (essenceType) => this.ctx.turnController.useEssencePower(essenceType));

        // Mostramos un mensaje de bienvenida con el nombre del usuario temporal.
        console.log(`Â¡Bienvenido a GameScene, ${this.playerData?.username || 'Jugador'}!`);
        // Si estamos en modo LAN y tenemos socket, conectar manejadores de red
        if (this.isLAN && this.socket) {
            // La pila LAN se construye y valida (ISyncGateway) en GameComposer.
            const lanStack = GameComposer.createLanStack({
                socket: this.socket,
                playerRole: this.playerRole,
                match: this.match,
                debug: this.debugSync
            });
            this.lan = lanStack.client;
            this.lanRouter = lanStack.router;
            this.ctx.lan = this.lan;
            this.ctx.lanRouter = this.lanRouter;
            this.lan.onGameEvent((payload) => {
                try {
                    this.ctx.remoteApplier.handle(payload);
                    if (this.ctx.turn.state === 'game-over') return;
                    const winner = this.ctx.turnController.checkVictoryConditions();
                    if (winner) {
                        this.ctx.turnController.endGame(winner, this.match.lastVictoryResult.reason);
                    } else if (this.match.lastVictoryResult.reason === 'bothTurnLimits') {
                        this.ctx.turnController.endGame(null, 'bothTurnLimits');
                    }
                } catch (e) {
                    console.error('Error manejando evento remoto:', e);
                }
            });

            // Listener para cambios de turno
            this.lan.onTurnChanged((data) => this.ctx.turnController.handleTurnChanged(data));

            // El combate solo comienza con el game_start validado por el servidor.
            this._onServerGameStart = this._handleServerGameStart.bind(this);
            this.lan.onGameStart(this._onServerGameStart);

            // Cubre el game_start recibido mientras GameScene todavía cargaba.
            if (this.earlyGameStart) {
                if (this.earlyGameStart.handler) {
                    this.socket.off('game_start', this.earlyGameStart.handler);
                }
                const earlyStart = this.earlyGameStart.data;
                this.earlyGameStart = null;
                if (earlyStart) this._handleServerGameStart(earlyStart);
            }
        }
        // Lanza la escena de UI en paralelo para que se muestre por encima.
        // Si ya existe una instancia previa, detenerla primero para evitar duplicados.
        if (this.scene.isActive('UIScene') || this.scene.isSleeping('UIScene')) {
            this.scene.stop('UIScene');
        }
        this.scene.launch('UIScene', { playerData: this.playerData, gameMode: this.gameMode });

        // ---------- LÃ“GICA DE JUGADORES ----------
        // Los jugadores ya vienen creados y poseÃ­dos por GameMatch.
        this.player.drawInitialHand();
        this.opponent.drawInitialHand();

        // Registramos las cartas iniciales de la mano del jugador como coleccionadas.
        const username = (this.playerData && this.playerData.username) || 'Jugador';
        (this.player.hand || []).forEach(card => {
            if (card && card.type) recordCollectedCard(username, card.type, card.level);
        });

        // Arena cinematográfica: foto de fondo, piedra, emblema, sigilos y viñeta.
        if (this.arena && this.arena.scene) {
            try { this.arena.destroy(); } catch { /* ignore */ }
        }
        this.arena = createArena(this, {
            width,
            height,
            depth: -0.4,
            layout: this.layout,
            photoKey: 'arena-photo'
        });
        this.board = this.arena;

        // Bandejas ornamentales de ambas manos.
        renderer.createBoardDecor();

        // Bombardeo ambiental puramente decorativo sobre el campo.
        this.bombs = new BattlefieldBombs(this, this.layout).start();
        this.triggerLevel2BombBarrage = (info = {}) => {
            if (this.bombs) {
                this.bombs.barrage({ count: 30, interval: 70 });
            }
            // Notificación visual simple
            try {
                const { width, height } = this.scale;
                const txt = this.add.text(width / 2, height / 2, '¡RAFAGA DE BOMBAS!', {
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '48px',
                    fontStyle: 'bold',
                    color: '#ff6b35',
                    stroke: '#000000',
                    strokeThickness: 6,
                    align: 'center'
                }).setOrigin(0.5).setDepth(2000);
                this.tweens.add({
                    targets: txt,
                    alpha: { from: 1, to: 0 },
                    scale: { from: 1, to: 1.4 },
                    duration: 1600,
                    ease: 'Cubic.easeOut',
                    onComplete: () => txt.destroy()
                });
            } catch { /* ignore */ }
        };

        // ---------- ZONA DE MANO DEL OPONENTE (4 espacios) ----------
        renderer.createSlotsRow(renderer.layout.opponentHandY, 'opponent-slots');
        renderer.createCardsRow(renderer.layout.opponentHandY, 'opponent-cards', this.opponent.hand);

        // ---------- CENTRO (campo de batalla con 6 espacios) ----------
        renderer.createSlotsRow(renderer.layout.opponentFieldY, 'opponent_battle_slots', 6); // Fila del oponente
        renderer.createSlotsRow(renderer.layout.playerFieldY, 'player_battle_slots', 6);   // Fila del jugador

        // ---------- ZONA DE MANO DEL JUGADOR (4 espacios) ----------
        renderer.createSlotsRow(renderer.layout.playerHandY, 'player-slots');
        renderer.createCardsRow(renderer.layout.playerHandY, 'player-cards', this.player.hand);

        // Avisar a la UI que la escena se creÃ³ exitosamente
        this.events.emit('board-ready');

        // Ya no hay tablero de video, usar click en escena para deseleccionar
        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (gameObjects.length === 0) {
                this.ctx.interaction.deselectCard();
            }
        });


        // --- LÃ³gica de Inicio de Partida ---
        // La partida no comienza hasta que la UI nos avise.
        // Evitar duplicar listeners si create() se llama varias veces.
        this.events.off('start-game');
        this.events.on('start-game', () => this._requestMatchStart());

        // Cleanup al apagar la escena: evitar listeners y escenas hijas corriendo.
        this.events.off('shutdown');
        this.events.on('shutdown', () => {
            // remover listeners propios
            this.events.off('start-game');
            this.events.off('request-essence-power');
            this.scale.off('resize', this._onGameResize, this);
            if (this.lan && this._onServerGameStart) {
                this.lan.offGameStart(this._onServerGameStart);
            }
            document.body.classList.remove('game-active');
            // detener el bombardeo ambiental
            if (this.bombs) {
                this.bombs.stop();
                this.bombs = null;
            }
            // detener la UIScene si estÃ¡ activa
            if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');
            // destruir temporizador si sigue activo
            this.ctx.turnController.destroyTimer();
        });

        // Ya no hay botÃ³n "Terminar turno": el turno termina automÃ¡ticamente
        // al ejecutar una acciÃ³n o por timeout. No registramos listener 'end-player-turn'.
    }

    /**
     * Solicita el inicio del combate. En LAN solo el host envía start_game;
     * ambos esperan el game_start validado por el servidor.
     */
    _requestMatchStart() {
        if (!this.ctx || this.ctx.turn.state !== 'pre-start') return;

        if (!this.isLAN) {
            this.ctx.turnController.beginMatch();
            return;
        }

        if (this.playerRole !== 'host') {
            this.events.emit('start-game-failed', 'Solo el anfitrión puede iniciar la partida.');
            return;
        }

        if (!this.lan) {
            this.events.emit('start-game-failed', 'Sin conexión con el servidor.');
            return;
        }

        if (this._startRequestPending) return;
        this._startRequestPending = true;
        this.events.emit('start-game-requested');

        this.lan.startGame((response) => {
            this._startRequestPending = false;
            if (!response || !response.success) {
                this.events.emit(
                    'start-game-failed',
                    (response && response.message) || 'No se pudo iniciar la partida.'
                );
            }
        });
    }

    /**
     * Aplica el game_start del servidor. Los eventos repetidos se ignoran
     * porque el estado de turno ya no está en pre-start.
     * @param {object|null} data Payload validado por el servidor.
     */
    _handleServerGameStart(data) {
        if (!this.ctx || this.ctx.turn.state !== 'pre-start') return;
        this._startRequestPending = false;
        this.gameStartData = data || null;
        this.ctx.gameStartData = this.gameStartData;
        this.ctx.turnController.beginMatch();
        this.events.emit('match-started');
    }

    /**
     * Se ejecuta en cada frame. Delega en el controlador de turnos la
     * actualización del contador del temporizador.
     */
    update() {
        this.ctx.turnController.update();
    }

    _onGameResize(gameSize) {
        if (!gameSize) return;
        const { width, height } = gameSize;
        if (!width || !height) return;

        this.layout = createBattleLayout(width, height, { usesGems: this.gameMode?.usesGems });
        this.cardHandSize = this.layout.cardHand;
        this.cardOpponentHandSize = this.layout.cardOpponentHand;
        this.cardFieldSize = this.layout.cardField;

        if (this.ctx) {
            this.ctx.layout = this.layout;
        }

        if (!this.ctx?.renderer) return;

        this.ctx.renderer.layout = this.layout;
        this.ctx.renderer.cardHandSize = this.cardHandSize;
        this.ctx.renderer.cardOpponentHandSize = this.cardOpponentHandSize;
        this.ctx.renderer.cardFieldSize = this.cardFieldSize;
        this.ctx.renderer.repositionAll(this.layout);

        if (this.arena?.active) this.arena.destroy();
        this.arena = createArena(this, {
            width,
            height,
            depth: -0.4,
            layout: this.layout,
            photoKey: 'arena-photo'
        });
        this.board = this.arena;

        if (this.bombs) {
            this.bombs.stop();
            this.bombs = new BattlefieldBombs(this, this.layout).start();
        }

        this.scene.get('UIScene')?.events?.emit('layout-resized', this.layout);
    }

    getObjectivesPayload() {
        return {
            mode: this.gameMode,
            requirements: this.gemRequirements,
            player: this.player?.gems.progress(),
            opponent: this.opponent?.gems.progress()
        };
    }
}
