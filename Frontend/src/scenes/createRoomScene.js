// createRoomScene.js
import Phaser from "phaser";
import { io } from 'socket.io-client';
import DomSceneBase from './ui/DomSceneBase.js';
import { loadVideoIfNeeded, createVideoBackground } from './ui/videoBackground.js';
import { listGameModes } from '../game/gameModes.js';

export default class CreateRoomScene extends DomSceneBase {
    constructor() {
        super("CreateRoomScene");
        this.playerData = null;
        this.selectedMode = 'clasico';
    }

    init(data) {
        this.playerData = data;
    }

    preload() {
        loadVideoIfNeeded(this, 'lan-bg-video', '/assets/images/LAN/fondoLAN.mp4');
    }

    create() {
        const { width, height } = this.scale;

        // BACKGROUND
        // Fondo de video inmediato con rectángulo de respaldo para que nunca se vea
        // un hueco negro mientras el video termina de preparar su primer frame.
        this.bg = createVideoBackground(this, 'lan-bg-video', 0x0a0e22);

        const username = (this.playerData && this.playerData.username) || "Jugador";

        const modesHtml = listGameModes().map(m => `
            <button type="button" class="mode-btn${m.id === this.selectedMode ? ' active' : ''}" data-mode="${m.id}" title="${m.desc}">
                ${m.name}
            </button>`).join('');

        // HTML UI TEMPLATE
        const html = `
        <style>
            :host { box-sizing: border-box; }

            .wrap {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                color: #f2e9d5;
                font-family: Poppins, Arial, sans-serif;
                overflow: hidden;
                transition: filter 160ms ease;
                background: linear-gradient(180deg, rgba(5, 8, 22, 0.50), rgba(5, 8, 22, 0.28) 40%, rgba(5, 8, 22, 0.34) 78%, rgba(4, 6, 18, 0.70));
            }

            .wrap::before {
                content: "";
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 1;
                background:
                    radial-gradient(760px 420px at 50% 30%, transparent 40%, rgba(5, 8, 20, 0.42) 100%),
                    radial-gradient(900px 420px at 14% -4%, rgba(108, 76, 235, 0.10), transparent 55%),
                    radial-gradient(820px 460px at 92% 102%, rgba(92, 196, 255, 0.08), transparent 56%);
            }

            .energy { position: absolute; z-index: 1; pointer-events: none; inset: 0; }

            .spark {
                position: absolute;
                width: 4px; height: 4px;
                border-radius: 50%;
                opacity: 0.5;
                animation: floaty 7s ease-in-out infinite alternate;
            }

            /* HEADER */
            .header {
                position: relative;
                z-index: 2;
                flex: 0 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 20px;
                padding: 16px 28px 10px;
            }
            .logo-box { display: flex; align-items: center; gap: 14px; }
            .logo {
                width: 50px; height: 50px;
                border-radius: 13px;
                object-fit: cover;
                box-shadow: 0 6px 22px rgba(0,0,0,0.5), 0 0 0 2px rgba(214, 180, 110, 0.30), 0 0 20px rgba(214, 180, 110, 0.10);
            }
            .brand-title {
                margin: 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 21px;
                font-weight: 800;
                letter-spacing: 0.05em;
                background: linear-gradient(180deg, #fff4d6, #d9b36a);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .brand-sub {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.66);
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }
            .btn-exit {
                position: relative;
                display: flex;
                align-items: center;
                gap: 7px;
                appearance: none;
                background: linear-gradient(160deg, rgba(58, 18, 34, 0.55), rgba(10, 14, 34, 0.68));
                border: 1px solid rgba(214, 180, 110, 0.40);
                color: #ffd9d9;
                padding: 10px 20px;
                border-radius: 12px;
                cursor: pointer;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.03em;
                box-shadow: inset 0 0 18px rgba(255, 120, 120, 0.06);
                transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
            }
            .btn-exit:hover {
                background: linear-gradient(160deg, rgba(120, 30, 48, 0.7), rgba(40, 20, 44, 0.72));
                transform: translateY(-2px);
                box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35), 0 0 22px rgba(255, 122, 122, 0.12);
            }

            /* MAIN */
            .main {
                position: relative;
                z-index: 2;
                flex: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 4vw;
                padding: 2vh 3vw 3vh;
            }

            /* PANELES DE CRISTAL OSCURO */
            .panel {
                position: relative;
                background: rgba(8, 13, 30, 0.55);
                backdrop-filter: blur(14px);
                border: 1px solid rgba(214, 180, 110, 0.32);
                border-radius: 20px;
                padding: 30px 30px 28px;
                display: flex;
                flex-direction: column;
                width: 38%;
                max-width: 500px;
                min-width: 330px;
                box-shadow: 0 26px 60px rgba(0, 0, 0, 0.5), inset 0 0 44px rgba(214, 180, 110, 0.04), 0 0 28px rgba(214, 180, 110, 0.05);
                overflow: hidden;
            }
            .panel::before {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: 20px;
                padding: 1px;
                pointer-events: none;
                background: linear-gradient(120deg, rgba(214, 180, 110, 0.65), rgba(214, 180, 110, 0.08) 24%, rgba(214, 180, 110, 0.10) 76%, rgba(214, 180, 110, 0.5));
                -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
            }
            .panel::after {
                content: "";
                position: absolute;
                top: 0; left: 12%; right: 12%;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(232, 207, 143, 0.75), transparent);
                box-shadow: 0 0 14px rgba(232, 207, 143, 0.45);
            }
            .panel-corner {
                position: absolute;
                width: 24px; height: 24px;
                pointer-events: none;
                filter: drop-shadow(0 0 6px rgba(214, 180, 110, 0.75));
            }
            .panel-corner.tl { top: 9px; left: 9px; border-top: 2px solid rgba(214, 180, 110, 0.9); border-left: 2px solid rgba(214, 180, 110, 0.9); border-top-left-radius: 12px; }
            .panel-corner.br { bottom: 9px; right: 9px; border-bottom: 2px solid rgba(214, 180, 110, 0.9); border-right: 2px solid rgba(214, 180, 110, 0.9); border-bottom-right-radius: 12px; }

            .panel-head {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 14px;
                margin-bottom: 6px;
            }
            .orn {
                flex: 1;
                max-width: 120px;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(214, 180, 110, 0.55), transparent);
            }
            .orn.l { margin-left: 8px; }
            .orn.r { margin-right: 8px; }
            .diamond {
                width: 9px; height: 9px;
                transform: rotate(45deg);
                background: rgba(232, 207, 143, 0.85);
                box-shadow: 0 0 10px rgba(232, 207, 143, 0.7);
            }
            .panel-kicker {
                display: block;
                text-align: center;
                font-size: 10px;
                letter-spacing: 0.30em;
                text-transform: uppercase;
                color: rgba(214, 180, 110, 0.85);
                margin-top: 4px;
            }
            .panel-title {
                margin: 2px 0 0;
                text-align: center;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: 0.03em;
                background: linear-gradient(180deg, #ffffff, #e6cf9d);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));
            }
            .panel-desc {
                margin: 4px 0 20px;
                text-align: center;
                font-size: 13px;
                line-height: 1.55;
                color: rgba(255, 255, 255, 0.72);
            }

            /* CÓDIGO DE PARTIDA */
            .code-block { text-align: center; margin-bottom: 20px; }
            .code-display {
                background: rgba(5, 9, 22, 0.55);
                border: 1px solid rgba(214, 180, 110, 0.4);
                border-radius: 13px;
                padding: 16px 10px;
                margin-bottom: 12px;
                color: #f2e6c4;
                font-family: 'Courier New', monospace;
                font-size: 27px;
                font-weight: 700;
                letter-spacing: 0.16em;
                text-align: center;
                text-shadow: 0 0 18px rgba(214, 180, 110, 0.4);
                box-shadow: inset 0 0 22px rgba(214, 180, 110, 0.06), 0 0 16px rgba(214, 180, 110, 0.06);
            }
            .btn-ghost {
                appearance: none;
                background: linear-gradient(160deg, rgba(14, 24, 60, 0.8), rgba(8, 14, 40, 0.8));
                border: 1px solid rgba(214, 180, 110, 0.5);
                color: #f1e7bc;
                padding: 9px 18px;
                border-radius: 10px;
                cursor: pointer;
                font-family: Poppins, Arial, sans-serif;
                font-size: 12.5px;
                font-weight: 600;
                letter-spacing: 0.05em;
                transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
            }
            .btn-ghost:hover {
                background: linear-gradient(160deg, rgba(20, 34, 82, 0.85), rgba(12, 20, 54, 0.85));
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), 0 0 18px rgba(214, 180, 110, 0.16);
            }
            .btn-ghost:disabled {
                opacity: 0.45;
                cursor: not-allowed;
                transform: none;
            }

            /* LISTA DE JUGADORES */
            .squad { margin-bottom: 22px; }
            .squad-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
                font-size: 11px;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.6);
            }
            .count-pill {
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 13px;
                color: #f1c86a;
                background: rgba(214, 180, 110, 0.10);
                border: 1px solid rgba(214, 180, 110, 0.28);
                border-radius: 999px;
                padding: 2px 10px;
            }
            .member {
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(5, 9, 22, 0.45);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 11px;
                padding: 11px 14px;
                margin-bottom: 8px;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.9);
            }
            .member em {
                font-style: normal;
                font-size: 11px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: rgba(214, 180, 110, 0.85);
                margin-left: 8px;
            }
            .member.waiting { color: rgba(255, 255, 255, 0.55); border-style: dashed; }
            .dot {
                width: 9px; height: 9px;
                border-radius: 50%;
                flex: 0 0 auto;
            }
            .dot.host { background: #e6b45c; box-shadow: 0 0 10px rgba(230, 180, 92, 0.8); }
            .dot.waiting { background: #5bc0ff; box-shadow: 0 0 10px rgba(91, 192, 255, 0.8); animation: blink 1.6s ease-in-out infinite; }
            .status-text { flex: 1; }

            /* BOTONES PRINCIPALES */
            .btn-primary {
                appearance: none;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin-top: auto;
                padding: 14px 20px;
                border-radius: 12px;
                cursor: pointer;
                font-family: Poppins, Arial, sans-serif;
                font-weight: 700;
                font-size: 15px;
                letter-spacing: 0.06em;
                transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease, filter 180ms ease, opacity 180ms ease;
            }
            .btn-primary.solid {
                background: linear-gradient(180deg, #ecd6a0, #c9a25a);
                border: 1px solid rgba(245, 225, 175, 0.8);
                color: #241d10;
                text-shadow: 0 1px 6px rgba(255, 255, 255, 0.25);
                box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35), 0 0 24px rgba(232, 207, 143, 0.25);
            }
            .btn-primary.solid:hover {
                transform: translateY(-3px);
                box-shadow: 0 14px 30px rgba(0, 0, 0, 0.4), 0 0 34px rgba(232, 207, 143, 0.40);
                filter: brightness(1.04);
            }
            .btn-primary.outline {
                background: linear-gradient(160deg, rgba(10, 18, 48, 0.78), rgba(6, 10, 30, 0.82));
                border: 1px solid rgba(214, 180, 110, 0.55);
                color: #f1e7bc;
                text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
                box-shadow: inset 0 0 22px rgba(91, 192, 255, 0.07), 0 0 20px rgba(91, 192, 255, 0.14);
            }
            .btn-primary.outline:hover {
                background: linear-gradient(160deg, rgba(16, 28, 70, 0.85), rgba(10, 16, 42, 0.85));
                border-color: rgba(232, 207, 143, 0.8);
                transform: translateY(-3px);
                box-shadow: inset 0 0 24px rgba(91, 192, 255, 0.10), 0 0 30px rgba(91, 192, 255, 0.26);
            }
            .btn-primary:active { transform: translateY(0) scale(0.98); }

            /* INPUT DE UNIÓN */
            .code-input {
                background: rgba(5, 9, 22, 0.55);
                border: 1px solid rgba(214, 180, 110, 0.4);
                border-radius: 13px;
                padding: 16px 10px;
                margin-bottom: 12px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 25px;
                font-weight: 700;
                letter-spacing: 0.16em;
                text-align: center;
                outline: none;
                box-shadow: inset 0 0 22px rgba(214, 180, 110, 0.06);
                transition: border-color 180ms ease, box-shadow 180ms ease;
            }
            .code-input::placeholder { color: rgba(255, 255, 255, 0.28); }
            .code-input:focus {
                border-color: rgba(232, 207, 143, 0.8);
                box-shadow: inset 0 0 22px rgba(214, 180, 110, 0.08), 0 0 22px rgba(214, 180, 110, 0.14);
            }
            .hint { font-size: 11.5px; color: rgba(255, 255, 255, 0.5); text-align: center; margin-bottom: 18px; }

            /* SELECTOR DE MODO */
            .mode-block { margin-bottom: 18px; }
            .mode-block .squad-head { margin-bottom: 8px; }
            .mode-select { display: flex; gap: 8px; flex-wrap: wrap; }
            .mode-btn {
                flex: 1 1 auto;
                appearance: none;
                cursor: pointer;
                padding: 8px 12px;
                border-radius: 10px;
                border: 1px solid rgba(214, 180, 110, 0.42);
                background: linear-gradient(160deg, rgba(10, 18, 48, 0.72), rgba(6, 10, 30, 0.72));
                color: #f1e7bc;
                font-family: Poppins, Arial, sans-serif;
                font-size: 12px;
                font-weight: 600;
                letter-spacing: 0.03em;
                transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
            }
            .mode-btn:hover { transform: translateY(-2px); }
            .mode-btn:active { transform: translateY(0) scale(0.98); }
            .mode-btn.active {
                border-color: #5bc0ff;
                color: #ffffff;
                background: linear-gradient(160deg, rgba(20, 40, 90, 0.92), rgba(10, 20, 50, 0.86));
                box-shadow: 0 0 18px rgba(91, 192, 255, 0.4), inset 0 0 14px rgba(91, 192, 255, 0.14);
            }

            /* EMBLEMA INFERIOR */
            .emblem {
                position: relative;
                z-index: 2;
                flex: 0 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 14px;
                padding: 8px 0 14px;
            }
            .em-line { width: 140px; height: 1px; background: linear-gradient(90deg, transparent, rgba(214, 180, 110, 0.5), transparent); }
            .em-diamond {
                width: 7px; height: 7px;
                transform: rotate(45deg);
                background: rgba(232, 207, 143, 0.8);
                box-shadow: 0 0 10px rgba(232, 207, 143, 0.6);
            }

            /* ANIMACIONES */
            @keyframes floaty {
                from { transform: translateY(6px); opacity: 0.25; }
                to { transform: translateY(-16px); opacity: 0.6; }
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.25; }
            }

            @media (max-width: 1080px) {
                .main { flex-direction: column; gap: 20px; overflow-y: auto; }
                .panel { width: 92%; max-width: 520px; min-width: 0; }
            }
        </style>

        <div class="wrap">
            <div class="energy">
                <span class="spark" style="left:8%; top:26%; background:#5bc0ff; animation-delay:-1s;"></span>
                <span class="spark" style="left:14%; top:62%; background:#7fe09a; animation-delay:-3s;"></span>
                <span class="spark" style="left:22%; top:40%; background:#ffb45c; animation-delay:-5s;"></span>
                <span class="spark" style="left:86%; top:30%; background:#b78bff; animation-delay:-2s;"></span>
                <span class="spark" style="left:80%; top:58%; background:#5bc0ff; animation-delay:-4s;"></span>
                <span class="spark" style="left:90%; top:72%; background:#7fe09a; animation-delay:-0.5s;"></span>
            </div>

            <header class="header">
                <div class="logo-box">
                    <img class="logo" src="/assets/images/logotipomenu.jpg" alt="Elemental Battlecards">
                    <div>
                        <h1 class="brand-title">Elemental Battlecards</h1>
                        <span class="brand-sub">Zona de combate LAN</span>
                    </div>
                </div>
                <button class="btn-exit">Salir</button>
            </header>

            <div class="main">

                <!-- LEFT: CREATE ROOM PANEL -->
                <section class="panel">
                    <span class="panel-corner tl"></span><span class="panel-corner br"></span>
                    <div class="panel-head">
                        <span class="orn l"></span>
                        <div>
                            <span class="panel-kicker">Anfitrión</span>
                            <h2 class="panel-title">Crear Sala</h2>
                        </div>
                        <span class="orn r"></span>
                    </div>
                    <p class="panel-desc">Comparte el código con tu amigo para que se una.</p>

                    <div class="code-block">
                        <div id="room-code" class="code-display">··· ···</div>
                        <button id="btn-copy" class="btn-ghost" disabled>Copiar código</button>
                    </div>

                    <div class="squad">
                        <div class="squad-head">
                            <span>Jugadores en sala</span>
                            <span class="count-pill" id="players-count">1/2</span>
                        </div>
                        <div class="member">
                            <span class="dot host"></span>
                            <span>${username}<em>Anfitrión</em></span>
                        </div>
                        <div class="member waiting">
                            <span class="dot waiting"></span>
                            <span id="room-status" class="status-text">Esperando jugador...</span>
                        </div>
                    </div>

                    <div class="mode-block">
                        <div class="squad-head">
                            <span>Modo de juego (anfitrión)</span>
                        </div>
                        <div class="mode-select" id="mode-select">
                            ${modesHtml}
                        </div>
                    </div>

                    <button class="btn-primary solid" id="btn-start">Iniciar partida</button>
                </section>

                <!-- RIGHT: JOIN ROOM PANEL -->
                <section class="panel">
                    <span class="panel-corner tl"></span><span class="panel-corner br"></span>
                    <div class="panel-head">
                        <span class="orn l"></span>
                        <div>
                            <span class="panel-kicker">Invitado</span>
                            <h2 class="panel-title">Unirse a sala</h2>
                        </div>
                        <span class="orn r"></span>
                    </div>
                    <p class="panel-desc">Ingresa el código que te compartieron.</p>

                    <input id="input-room-code" class="code-input" placeholder="XXX XXX" maxlength="7" spellcheck="false" autocomplete="off">
                    <div class="hint">El código de partida tiene 6 dígitos.</div>

                    <button class="btn-primary outline" id="btn-join">Unirse a sala</button>
                </section>

            </div>

            <div class="emblem">
                <span class="em-line"></span>
                <span class="em-diamond"></span>
                <span class="em-line"></span>
            </div>
        </div>`;

        // DOM UI
        const node = this.mountDOM(html);

        // Añadir clases de animación y manejadores de interacción a los botones
        try {
            const animatedBtns = node.querySelectorAll('.btn-primary, .btn-exit, .btn-ghost');
            animatedBtns.forEach((b, i) => {
                if (b.id === 'btn-start') b.classList.add('pulse');
                this.track(b, () => { b.style.transform = 'translateY(0) scale(0.98)'; }, 'pointerdown');
                this.track(b, () => { b.style.transform = ''; }, 'pointerup');
                this.track(b, () => { b.style.transform = ''; }, 'pointerleave');
            });
        } catch (e) {
            console.warn('No se pudieron inicializar animaciones de botones', e);
        }

        // Mode selection (host)
        const modeButtons = node.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            this.track(btn, () => {
                this.selectedMode = btn.getAttribute('data-mode');
                modeButtons.forEach(b => b.classList.toggle('active', b === btn));
                console.log(`Modo LAN seleccionado: ${this.selectedMode}`);
            }, 'click');
        });

        // BUTTONS
        const exitBtn = node.querySelector(".btn-exit");
        const startBtn = node.querySelector("#btn-start");
        if (exitBtn) this.track(exitBtn, () => {
            // Use start to ensure the scene is launched/returned to reliably
            this.scene.start("HomeScenes");
        }, 'click');

        // Inicializar socket después de que el DOM exista
        // Determinar URL del backend (prioridad):
        // 1) Parametro de query ?backend=http://IP:PORT
        // 2) Variable global `window.BACKEND_URL` (útil para VS Code previews)
        // 3) Por defecto usar location.hostname con puerto 3001
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        let SERVER_URL = null;
        if (params.has('backend')) {
            SERVER_URL = params.get('backend');
        } else if (typeof window !== 'undefined' && window.BACKEND_URL) {
            SERVER_URL = window.BACKEND_URL;
        } else if (typeof window !== 'undefined') {
            SERVER_URL = `http://${location.hostname}:3001`;
        } else {
            SERVER_URL = 'http://localhost:3001';
        }
        console.log('Usando BACKEND_URL =', SERVER_URL);
        this.socket = io(SERVER_URL);
        this.currentRoom = null;
        this.playersInRoom = 0;
        this.playerRole = null; // 'host' o 'guest'

        this.socket.on('connect', () => {
            console.log('Socket conectado (cliente):', this.socket.id);
        });

        const formatCode = (c) => {
            if (!c) return '';
            const s = c.toString().replace(/\s+/g, '');
            return s.slice(0,3) + (s.length > 3 ? ' ' + s.slice(3) : '');
        };

        const updateCodeUI = (code) => {
            this.currentRoom = code;
            const codeEl = this.domUI.node.querySelector('#room-code');
            if (codeEl) codeEl.textContent = formatCode(code);
            this.playersInRoom = 1;
            const playersEl = this.domUI.node.querySelector('#players-count');
            if (playersEl) playersEl.textContent = `${this.playersInRoom}/2`;
            const statusEl = this.domUI.node.querySelector('#room-status');
            if (statusEl) statusEl.textContent = 'Esperando jugador...';
            const copyBtn = this.domUI.node.querySelector('#btn-copy');
            if (copyBtn) copyBtn.disabled = false;
        };

        this.socket.on('room_created', ({ code }) => {
            updateCodeUI(code);
        });

        this.socket.on('player_joined', ({ players, canStart }) => {
            this.playersInRoom = players || (this.playersInRoom + 1);
            const playersEl = this.domUI.node.querySelector('#players-count');
            if (playersEl) playersEl.textContent = `${this.playersInRoom}/2`;
            const statusEl = this.domUI.node.querySelector('#room-status');
            if (statusEl) statusEl.textContent = 'Jugador conectado';
            
            // Si la sala está completa y podemos iniciar, el botón cambia de texto
            if (canStart) {
                const startBtn = this.domUI.node.querySelector('#btn-start');
                if (startBtn) startBtn.textContent = 'Iniciar Partida';
            }
        });
        
        // Listener para cuando el juego puede comenzar automáticamente
        this.socket.on('game_start', (data) => {
            console.log('Juego iniciando...', data);
            this.keepSocket = true;
            this.scene.start('GameSceneLAN', { 
                roomCode: this.currentRoom, 
                socket: this.socket, 
                playerData: this.playerData,
                playerRole: this.playerRole,
                gameMode: (data && data.gameMode) || this.selectedMode,
                gameStartData: data
            });
        });

        this.socket.on('player_left', () => {
            this.playersInRoom = Math.max(1, this.playersInRoom - 1);
            const playersEl = this.domUI.node.querySelector('#players-count');
            if (playersEl) playersEl.textContent = `${this.playersInRoom}/2`;
            const statusEl = this.domUI.node.querySelector('#room-status');
            if (statusEl) statusEl.textContent = 'Esperando jugador...';
        });

        this.socket.on('game_event', (payload) => {
            console.log('Evento de juego recibido:', payload);
        });

        // flag para decidir si mantener socket al cambiar de escena
        this.keepSocket = false;

        if (startBtn) this.track(startBtn, () => {
            // Si no hay sala, crearla; si ya existe y hay 2 jugadores, iniciar escena de juego
            if (!this.currentRoom) {
                this.socket.emit('create_room', { gameMode: this.selectedMode }, (res) => {
                    if (res && res.success && res.code) {
                        console.log('Sala creada con código', res.code, 'rol:', res.role);
                        this.playerRole = res.role; // Guardar rol (host)
                        // UI se actualiza por el evento 'room_created'
                        // también actualizamos inmediatamente por si el evento llega después
                        updateCodeUI(res.code);
                        // NO iniciamos escena inmediatamente, esperamos a que se una el segundo jugador
                        // El evento 'game_start' iniciará la escena automáticamente
                    } else {
                        console.error('Error creando sala', res);
                    }
                });
            } else {
                // Si ya estamos en una sala y hay 2 jugadores, iniciar manualmente
                if (this.playersInRoom >= 2) {
                    this.keepSocket = true;
                    this.scene.start('GameSceneLAN', { 
                        roomCode: this.currentRoom, 
                        socket: this.socket, 
                        playerData: this.playerData,
                        playerRole: this.playerRole,
                        gameMode: this.selectedMode
                    });
                } else {
                    console.log('Esperando al segundo jugador antes de iniciar.');
                }
            }
        }, 'click');

        const joinBtn = node.querySelector('#btn-join');
        if (joinBtn) {
            this.track(joinBtn, () => {
                const rawCode = node.querySelector('#input-room-code').value;
                const code = rawCode.replace(/\s+/g, '');
                console.log('Intentando unirse a sala');
                console.log('   Código raw:', `"${rawCode}"`);
                console.log('   Código limpio:', `"${code}"`);
                console.log('   Longitud:', code.length);
                
                if (!code) {
                    console.warn('Código vacío');
                    alert('Por favor ingresa un código de sala');
                    return;
                }
                
                if (code.length !== 6) {
                    console.warn('Código debe tener 6 dígitos, tiene:', code.length);
                    alert('El código debe tener 6 dígitos');
                    return;
                }
                
                console.log('Enviando solicitud de unión con código:', code);
                this.socket.emit('join_room', { code }, (res) => {
                    console.log('Respuesta del servidor:', res);
                    if (res && res.success) {
                        console.log('Entré a la sala', res.code, 'rol:', res.role);
                        this.currentRoom = res.code;
                        this.playerRole = res.role; // Guardar rol (guest)
                        this.playersInRoom = 2;
                        // NO iniciamos escena inmediatamente
                        // El evento 'game_start' del servidor iniciará la escena para ambos jugadores
                    } else {
                        console.error('No se pudo unir a la sala:', res && res.message);
                        alert(res && res.message ? res.message : 'No se pudo unir a la sala');
                    }
                });
            }, 'click');
        }

        // Copy button handler
        const copyBtn = node.querySelector('#btn-copy');
        if (copyBtn) {
            copyBtn.disabled = true;
            this.track(copyBtn, async () => {
                if (!this.currentRoom) return;
                const text = this.currentRoom;
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.textContent = 'Copiado';
                    setTimeout(() => { copyBtn.textContent = 'Copiar código'; }, 1500);
                } catch (e) {
                    // fallback
                    const input = document.createElement('input');
                    input.value = text;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    copyBtn.textContent = 'Copiado';
                    setTimeout(() => { copyBtn.textContent = 'Copiar código'; }, 1500);
                }
            }, 'click');
        }
    }

    onShutdown() {
        // Desconectar socket si existe y no queremos mantenerlo (por ejemplo al cerrar la UI).
        if (this.socket && !this.keepSocket) {
            try {
                this.socket.disconnect();
            } catch (e) {
                // ignore
            }
        }
        super.onShutdown();
    }

    onResize(gameSize) {
        // Defensive: gameSize may be undefined in some calls
        if (!gameSize) return;
        const { width, height } = gameSize;

        if (this.bg) this.bg.setDisplaySize(width, height);

        super.onResize(gameSize);
    }
}