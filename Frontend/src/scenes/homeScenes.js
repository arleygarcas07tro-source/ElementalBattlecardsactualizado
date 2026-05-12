import Phaser from "phaser";

export default class HomeScenes extends Phaser.Scene {
    constructor() {
        super("HomeScenes");
        this.playerData = null;
    }

    init(data) {
        this.playerData = data;
    }

    preload() {
        this.load.video("home-video", "/assets/images/home.mp4", { muted: true });
    }

    create() {
        const { width, height } = this.scale;

        // BACKGROUND
        this.bg = this.add.video(width / 2, height / 2, 'home-video').setOrigin(0.5);
        this.bg.setDepth(-1); // Poner el video al fondo

        // Esperar a que el video esté listo para escalar correctamente
        this.bg.on('play', () => {
            const scaleX = width / this.bg.width;
            const scaleY = height / this.bg.height;
            const scale = Math.max(scaleX, scaleY);
            this.bg.setScale(scale);
        });
        this.bg.play(true); // Reproducir en bucle

        // UI TEMPLATE (incluye modal overlay)
        const html = `<div class="scene-root">
        <style>
            :host { box-sizing: border-box; }

            .wrap {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                color: white;
                font-family: Poppins, Arial;
                overflow: hidden;
                transition: filter 160ms ease;
            }

            /* HEADER */
            .header {
                flex: 0 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 28px;
                max-width: 100%;
            }
            .logo-box { display: flex; align-items: center; gap: 12px; }
            .logo { width: 50px; height: 50px; }
            .user { font-size: 14px; opacity: 0.85; }
            .btn-exit {
                background: #b90000;
                padding: 10px 16px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                color: white;
                font-weight: bold;
            }

            /* MAIN CONTENT */
            .main {
                flex: 1;
                display: flex;
                padding: 2.5vh 3vw;
                gap: 5vw;
                overflow: hidden;
                justify-content: center;
                align-items: center;
            }

            /* PANEL BASE */
            .panel {
                background: rgba(0,0,0,0.45);
                backdrop-filter: blur(8px);
                border-radius: 14px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                flex: 1;
                height: auto;
                max-height: 100%;
                width: auto;
                max-width: 35%;
                box-shadow: 0 0 12px rgba(0,0,0,0.55);
            }

            .play-panel {
                height: 60%;
                width: 40%;
                min-width: 320px;
                min-height: 300px;
                display: flex;
                flex-direction: column;
            }

            .stats-panel {
                display: flex;
                flex-direction: column;
                height: auto;
                width: 20%;
                min-width: 260px;
            }

            h2 { margin: 0; font-size: 28px; }
            p { margin: 0 0 18px 0; }

            .blank-box {
                flex: 1;
                background: rgba(255,255,255,0.08);
                border-radius: 10px;
                margin-bottom: 20px;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: 1fr auto;
                row-gap: 8px;
                margin-bottom: 60px;
                gap: 15px;
            }

            .actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 10px;
            }

            .btn-primary {
                padding: 12px;
                background: #8a00ff;
                border-radius: 8px;
                border: none;
                color: white;
                cursor: pointer;
            }

            /* MODAL / OVERLAY */
            .modal-overlay {
                position: absolute;
                inset: 0;
                display: none;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.45);
                z-index: 10000;
                pointer-events: auto;
                backdrop-filter: blur(2px);
            }
            .modal-overlay.show { display: flex; }

            .modal {
                background: rgba(10,10,10,0.95);
                color: white;
                padding: 20px;
                border-radius: 10px;
                max-width: 720px;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                /* por defecto modal no ocupa toda la altura ni hace scroll */
                max-height: 90vh;
                overflow: visible;
            }

            /* Clase especial para modales largos (mecánicas): 80% de la pantalla y con scroll */
            .modal--tall {
                max-height: 80vh;
                overflow: auto;
            }
            .modal--tall .modal-body {
                /* asegurar scroll interno si el contenido es largo */
                max-height: calc(80vh - 80px);
                overflow: auto;
            }

            .modal .modal-title { font-weight: 700; margin-bottom: 8px; }
            .modal .modal-body { margin-bottom: 16px; }
            .modal .modal-actions { display:flex; justify-content:flex-end; gap:8px; }
            .modal .btn-close {
                padding: 8px 12px; border-radius: 8px; border:none; cursor:pointer;
                background:#666; color:white;
            }
        </style>

        <div class="wrap">
            <header class="header">
                <div class="logo-box">
                    <img class="logo" src="/assets/images/logo.png">
                    <div>
                        <h1 style="margin:0; font-size:22px;">Elemental Battlecards</h1>
                        <span class="user">Jugador: ${(this.playerData && this.playerData.username) || ""}</span>
                    </div>
                </div>
                <button class="btn-exit">Salir</button>
            </header>

            <div class="main">
                <section class="panel play-panel">
                    <h2 style="margin-bottom:20px">Iniciar Partida</h2>
                    <p>Haz click en "Jugar Ahora" para comenzar.</p>
                    <div class="blank-box"></div>
                    <button class="btn-primary" id="play">Jugar en LAN</button>
                    <button class="btn-primary" id="play-bot" style="margin-top:10px; background:#0066cc;">Jugar con bot</button>
                </section>

                <section class="panel stats-panel">
                    <h2 style="margin-bottom:20px">Estadísticas</h2>
                    <div class="stats-grid">
                        <span>Partidas jugadas</span> <span>0</span>
                        <span>Partidas ganadas</span> <span>0</span>
                        <span>Logros</span> <span>0/50</span>
                        <span>Tiempo Jugado</span> <span>0h 0m</span>
                    </div>

                    <h2>Acciones</h2>
                    <div class="actions">
                        <button class="btn-primary" data-modal="config">Configuración</button>
                        <button class="btn-primary" data-modal="about">Acerca de</button>
                        <button class="btn-primary" data-modal="mechanics">Mecánicas del juego</button>
                    </div>
                </section>
            </div>
        </div>

        <!-- Modal overlay (oculto por defecto) -->
        <div class="modal-overlay" id="scene-modal" aria-hidden="true">
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div class="modal-title" id="modal-title"></div>
                <div class="modal-body" id="modal-body"></div>
                <div class="modal-actions">
                    <button class="btn-close" id="modal-close">Cerrar</button>
                </div>
            </div>
        </div></div>`;

        // DOM ELEMENT
        this.domUI = this.add.dom(0, 0).createFromHTML(html);
        this.domUI.setOrigin(0);
        this.domUI.setDepth(9999);

        const node = this.domUI.node;
        node.style.position = "absolute";
        node.style.left = 0;
        node.style.top = 0;
        node.style.width = width + "px";
        node.style.height = height + "px";
        node.style.pointerEvents = "auto";

        // --- LÓGICA DE LOS BOTONES ---
        // EXIT BUTTON
        const exitBtn = node.querySelector(".btn-exit");
        if (exitBtn) exitBtn.onclick = () => this.scene.switch("LoginScene");

        // Modal elements and helpers
        const modalOverlay = node.querySelector('#scene-modal');
        const modalElement = node.querySelector('.modal'); // elemento .modal (donde aplicaremos modal--tall)
        const modalTitle = node.querySelector('#modal-title');
        const modalBody = node.querySelector('#modal-body');
        const modalClose = node.querySelector('#modal-close');
        const wrap = node.querySelector('.wrap');

        const openModal = (title, htmlContent) => {
            if (!modalOverlay || !wrap) return;
            // eliminar cualquier clase residual antes de abrir
            if (modalElement) modalElement.classList.remove('modal--tall');
            modalTitle.textContent = title || "";
            modalBody.innerHTML = htmlContent || "";
            modalOverlay.classList.add('show');
            modalOverlay.setAttribute('aria-hidden', 'false');
            wrap.style.filter = "blur(6px)";
        };

        const closeModal = () => {
            if (!modalOverlay || !wrap) return;
            modalOverlay.classList.remove('show');
            modalOverlay.setAttribute('aria-hidden', 'true');
            wrap.style.filter = "";
            // limpiar clase de modal largo si existe
            if (modalElement) modalElement.classList.remove('modal--tall');
        };

        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        // ESC para cerrar modal
        this.input.keyboard.on('keydown-ESC', () => {
            closeModal();
        });

        // Asignar acciones distintas por botón
        const btnConfig = node.querySelector('[data-modal="config"]');
        const btnAbout = node.querySelector('[data-modal="about"]');
        const btnMechanics = node.querySelector('[data-modal="mechanics"]');

        if (btnConfig) btnConfig.addEventListener('click', () => {
            openModal("Configuración");
        });
        if (btnAbout) btnAbout.addEventListener('click', () => {
            openModal("Acerca de", `<p>Este proyecto es un juego de cartas estratégico digital inspirado en la Teoría de Conjuntos, donde cada mecánica del sistema corresponde a una operación matemática formal.</p>
            <p>El objetivo del jugador es vencer al oponente mediante combate, o completar el conjunto total de esencias y elementos activos en el campo.</p>
            <p>El sistema de juego se basa en los siguientes principios matemáticos:</p>
            <ul>
                <li><strong>Unión (A ∪ B ∪ C):</strong> Representada por la obtención simultánea de los 6 tipos elementales en tu lado del campo o la colección completa de las 6 esencias.</li>
                <li><strong>Intersección (A ∩ A):</strong> La fusión de dos cartas idénticas para crear cartas de nivel superior.</li>
                <li><strong>Diferencia (A − B):</strong> El sistema de ventajas elementales, donde un elemento supera al que “resta”.</li>
                <li><strong>Complemento (Aᶜ):</strong> Cartas de nivel 3 que quedan fuera de la relación elemental y anulan ventajas y desventajas.</li>
            </ul>
            <p>Durante la partida, el jugador administra recursos (esencias), controla un campo de seis espacios, invoca cartas, realiza fusiones, interactúa con el rival mediante ataques y construye estrategias basadas en combinaciones elementales y operaciones matemáticas.</p>
            <p>El resultado es un TCG elegante, educativo y competitivo, con una identidad visual basada en iconografía elemental, colores definidos y un layout claro optimizado para pantallas modernas.</p>`);
        });
        if (btnMechanics) btnMechanics.addEventListener('click', () => {
            // abrir modal y aplicar clase para que tenga altura = 80% pantalla y scroll
            openModal("Mecánicas del juego", `<ol>
            <li><strong>Objetivo del Juego:</strong>
                <ul>
                    <li><strong>Principal:</strong> El primer jugador que logre tener los 6 tipos de cartas distintos en su campo gana la partida.</li>
                    <li><strong>Secundario:</strong> El jugador que logre llenar las esencias elementales, gana.</li>
                </ul>
            </li>

            <li><strong>Tipos y Ventajas:</strong>
                <p>El sistema está dividido en dos triángulos independientes:</p>
                <h3>Triángulo 1:</h3>
                <ul>
                    <li>Fuego vence a Planta</li>
                    <li>Planta vence a Agua</li>
                    <li>Agua vence a Fuego</li>
                </ul>
                <h3>Triángulo 2:</h3>
                <ul>
                    <li>Luz vence a Sombra</li>
                    <li>Sombra vence a Espíritu</li>
                    <li>Espíritu vence a Luz</li>
                </ul>
                <p><strong>Relación entre triángulos:</strong> Todos los tipos de un triángulo son neutrales contra los del otro triángulo.</p>
            </li>

            <li><strong>Niveles de Carta:</strong>
                <p>Las cartas pueden tener 3 niveles:</p>
                <ul>
                    <li><strong>⭐ Nivel 1 (base)</strong></li>
                    <li><strong>⭐⭐ Nivel 2 (fusión de dos cartas nivel 1 iguales)</strong></li>
                    <li><strong>⭐⭐⭐ Nivel 3 (fusión de dos cartas nivel 2 iguales)</strong></li>
                </ul>
                <p><strong>Efecto de los niveles en el combate:</strong></p>
                <ul>
                    <li>Mismo nivel: se aplica ventaja de tipo normal.</li>
                    <li>1 nivel arriba: se vuelve neutral al tipo que tiene desventaja, le gana al tipo que es neutral.</li>
                    <li>2 niveles arriba: ganará siempre.</li>
                </ul>
            </li>

            <li><strong>Turnos:</strong>
                <p>El juego es por turnos, 1v1. En cada turno el jugador puede realizar 1 sola acción:</p>
                <ul>
                    <li>Poner una carta en el campo.</li>
                    <li>Atacar con una carta.</li>
                    <li>Fusionar (si cumple requisitos).</li>
                </ul>
                <p>Después de realizar la acción, el turno termina.</p>
            </li>

            <li><strong>Regla de Ataque Obligatorio:</strong>
                <p>Cada jugador debe atacar al menos una vez cada 3 turnos propios. Puedes atacar antes si quieres. Si atacas antes (por ejemplo, en tu turno 2), el contador se reinicia. Si llegas al turno 3 sin atacar, ese turno obligatoriamente debes atacar.</p>
                <p><strong>Otros casos:</strong></p>
                <ul>
                    <li>Si tienes que atacar obligatoriamente y tu oponente no tiene cartas en el campo, podrás llenar una Esencia elemental (atacando).</li>
                    <li>Si tienes que atacar obligatoriamente y no tienes cartas, saltará el turno y el contador se reiniciará.</li>
                </ul>
            </li>

            <li><strong>Campo y Mano:</strong>
                <p>Cada jugador tiene 6 espacios en el campo. Se puede tener máximo 1 carta por espacio. Se inicia con 4 cartas en la mano. Cuando colocas una carta en el campo, robas una nueva del mazo.</p>
            </li>

            <li><strong>Robos y Mazo:</strong>
                <p>Cada jugador inicia con 48 cartas (8 copias de cada tipo). Cuando pones una carta, robas una del mazo (para mantener 4 en la mano). Si el mazo se queda sin cartas, se baraja automáticamente el cementerio (ver Regla 10).</p>
            </li>

            <li><strong>Colocar Cartas:</strong>
                <p>Las cartas siempre se colocan boca abajo (ocultas para el rival). Se revelan en tres casos:</p>
                <ul>
                    <li>Cuando atacan.</li>
                    <li>Cuando son atacadas.</li>
                    <li>Cuando se fusionan.</li>
                </ul>
                <p>Una vez reveladas, permanecen boca arriba para el resto de la partida.</p>
            </li>

            <li><strong>Combate:</strong>
                <p><strong>Cómo se realiza:</strong></p>
                <ul>
                    <li>El jugador atacante elige una de sus cartas.</li>
                    <li>Elige una carta del oponente.</li>
                </ul>
                <p><strong>Resultados:</strong></p>
                <ul>
                    <li>Si tu carta gana → la carta enemiga muere.</li>
                    <li>Si tu carta pierde → tu carta muere.</li>
                    <li>Si son neutrales → ninguna muere.</li>
                </ul>
            </li>

            <li><strong>Muertes y Cementerio:</strong>
                <p>Cuando una carta muere, va al cementerio. Cuando las 48 cartas del mazo se acaban, las del cementerio se revuelven y se crea un nuevo mazo.</p>
            </li>

            <li><strong>Fusiones:</strong>
                <p><strong>Requisitos:</strong> Tener 2 cartas iguales (tipo y nivel) en el campo. Fusionar consume tu acción del turno.</p>
                <p><strong>Efecto:</strong> Se forma una sola carta del mismo tipo y sube un nivel. La carta fusionada se revela.</p>
            </li>

            <li><strong>Restricciones de Ataques según Nivel:</strong>
                <ul>
                    <li>⭐ Nivel 1 → puede atacar cada turno (sin límites).</li>
                    <li>⭐⭐ Nivel 2 → puede atacar 2 turnos seguidos luego debe descansar 1 turno.</li>
                    <li>⭐⭐⭐ Nivel 3 → puede atacar 1 turno, luego debe descansar 1 turno.</li>
                </ul>
            </li>

            <li><strong>Esencias Elementales:</strong>
                <p>Cada jugador tiene 6 esencias, una por cada tipo elemental. Todas las esencias comienzan vacías. Se llenan cuando se cumplen las condiciones de atacar y no haber cartas del oponente para defender.</p>
            </li>

            <li><strong>Revelación:</strong>
                <p>Las cartas boca abajo se revelan solo cuando:</p>
                <ul>
                    <li>Atacan.</li>
                    <li>Son atacadas.</li>
                    <li>Se fusionan (la resultante entra boca arriba).</li>
                </ul>
            </li>

            <li><strong>Límites de Tiempo:</strong>
                <p>Cada turno tiene un máximo de 12 segundos. Si el jugador no realiza acción → pierde el turno.</p>
            </li>

            <li><strong>Fin del Juego:</strong>
                <p>Un jugador gana si:</p>
                <ul>
                    <li>Logra colocar los 6 tipos distintos en su campo (no importa el orden ni si están ocultas).</li>
                    <li>Logra llenar las esencias elementales (no importa el orden).</li>
                    <li>Por abandono: Si un jugador no actúa durante 3 turnos seguidos → se considera rendido. A los 3 turnos sin acción, derrota automática.</li>
                </ul>
            </li>
        </ol>`);
            if (modalElement) modalElement.classList.add('modal--tall');
        });

        // Play button (LAN) y Play vs Bot
        const playBtn = node.querySelector('#play');
        if (playBtn) playBtn.addEventListener('click', () => {
            // Al hacer clic en "Jugar en LAN", llevamos al usuario a la escena de creación de sala.
            console.log("Transicionando a la escena de creación de sala (LAN)...");
            this.scene.start('CreateRoomScene', { playerData: this.playerData });
        });

        const playBotBtn = node.querySelector('#play-bot');
        if (playBotBtn) playBotBtn.addEventListener('click', () => {
            console.log('Seleccionando dificultad de Bot...');
            this.scene.start('DifficultySelectScene', { playerData: this.playerData });
        });

        // Responsive resize handler
        this.scale.on("resize", this.onResize, this);
    }

    onResize(gameSize) {
        const { width, height } = gameSize;

        if (this.bg) this.bg.setDisplaySize(width, height);

        if (this.domUI && this.domUI.node) {
            const node = this.domUI.node;
            if (node.style) {
                node.style.width = width + "px";
                node.style.height = height + "px";
            }
        }
    }
}