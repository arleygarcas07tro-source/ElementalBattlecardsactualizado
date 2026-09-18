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

/**
 * Escena principal del juego de cartas.
 *
 * Responsabilidad agregada (tras el split): actuar como coordinador delgado.
 * No contiene reglas de dominio ni detalles de pintado; construye el contexto
 * compartido y delega en las clases de presentación:
 *  - BoardRenderer      → objetos visuales del tablero/manos/mazos/efectos.
 *  - CardInteraction    → selección, jugar carta, fusión y ataque del jugador.
 *  - BotTurnRunner      → turno del bot (contexto + ejecución del plan de IA).
 *  - RemoteEffectApplier→ efectos de eventos LAN sobre el tablero.
 *  - TurnController     → flujo de turnos, temporizador, victoria y fin de partida.
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
        // Tamaños visuales fijos para normalizar tamaño real de todas las texturas
        this.cardHandSize = { width: 110, height: 158 }; // tamaño visual en mano
        this.cardFieldSize = { width: 110, height: 158 }; // tamaño visual en campo / fusiones

        // Motor de partida (dominio). Se construye en create() y posee a los
        // jugadores y el flujo de turnos; la escena solo los referencia.
        this.match = null;
        this.turn = null; // Alias de this.match.turn para el resto de la escena.
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
        this.bot = GameComposer.createBot({ difficulty: data.botDifficulty || 3 }); // 1-10, default: Normal (3)
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

        // Reset / inicialización por si la escena se reutiliza entre partidas.
        // El motor de partida se construye en el composition root (GameComposer).
        this.match = GameComposer.createMatch({ config: GAME_CONFIG });
        this.player = this.match.player;
        this.opponent = this.match.opponent;
        this.turn = this.match.turn;
        this.turn.reset();

        // Contexto compartido por las clases de presentación. Es el único punto
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
            lan: null,
            lanRouter: null,
            renderer: null,
            interaction: null,
            attackController: null,
            botRunner: null,
            remoteApplier: null,
            turnController: null
        };

        const renderer = new BoardRenderer(this.ctx, { hand: this.cardHandSize, field: this.cardFieldSize });
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
        // que es donde UIScene escucha. La escena solo reenvía, no decide reglas.
        this.match.events.on('essence-activated', (ownerId, essenceType) => this.events.emit('essence-activated', ownerId, essenceType));
        this.match.events.on('convergence-status', (state) => this.events.emit('convergence-status', state));
        this.match.events.on('essence-power-used', (info) => this.events.emit('essence-power-used', info.essenceType, info.name));

        // Poderes de esencia: la UIScene emite la solicitud al hacer clic en un
        // orbe propio. La validación de dominio vive en GameMatch.
        this.events.off('request-essence-power');
        this.events.on('request-essence-power', (essenceType) => this.ctx.turnController.useEssencePower(essenceType));

        // Mostramos un mensaje de bienvenida con el nombre del usuario temporal.
        console.log(`¡Bienvenido a GameScene, ${this.playerData?.username || 'Jugador'}!`);
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
                } catch (e) {
                    console.error('Error manejando evento remoto:', e);
                }
            });

            // Listener para cambios de turno
            this.lan.onTurnChanged((data) => this.ctx.turnController.handleTurnChanged(data));
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
        // Los jugadores ya vienen creados y poseídos por GameMatch.
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
        renderer.createFieldDecor();

        // ---------- ZONA DE MANO DEL OPONENTE (4 espacios) ----------
        renderer.createSlotsRow(height * 0.18, 'opponent-slots');
        renderer.createCardsRow(height * 0.18, 'opponent-cards', this.opponent.hand);

        // ---------- CENTRO (campo de batalla con 6 espacios) ----------
        renderer.createSlotsRow(height * 0.45 - battleRowYOffset, 'opponent_battle_slots', 6); // Fila del oponente
        renderer.createSlotsRow(height * 0.55 + battleRowYOffset, 'player_battle_slots', 6);   // Fila del jugador

        // ---------- ZONA DE MANO DEL JUGADOR (4 espacios) ----------
        renderer.createSlotsRow(height * 0.825, 'player-slots');
        renderer.createCardsRow(height * 0.825, 'player-cards', this.player.hand);

        // ---------- MAZOS ----------
        renderer.createDecks(this.player.deck.getCardsCount(), this.opponent.deck.getCardsCount());

        // Avisar a la UI que la escena se creó exitosamente
        this.events.emit('board-ready');

        // --- Lógica de Clic para Deseleccionar ---
        // Si hacemos clic en el tablero, deseleccionamos cualquier carta.
        this.board.setInteractive();
        this.board.on('pointerdown', () => this.ctx.interaction.deselectCard());


        // --- Lógica de Inicio de Partida ---
        // La partida no comienza hasta que la UI nos avise.
        // Evitar duplicar listeners si create() se llama varias veces.
        this.events.off('start-game');
        this.events.on('start-game', () => this.ctx.turnController.beginMatch());

        // Cleanup al apagar la escena: evitar listeners y escenas hijas corriendo.
        this.events.off('shutdown');
        this.events.on('shutdown', () => {
            // remover listeners propios
            this.events.off('start-game');
            this.events.off('request-essence-power');
            // detener la UIScene si está activa
            if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');
            // destruir temporizador si sigue activo
            this.ctx.turnController.destroyTimer();
        });

        // Ya no hay botón "Terminar turno": el turno termina automáticamente
        // al ejecutar una acción o por timeout. No registramos listener 'end-player-turn'.
    }

    /**
     * Se ejecuta en cada frame. Delega en el controlador de turnos la
     * actualización del contador del temporizador.
     */
    update() {
        this.ctx.turnController.update();
    }
}
