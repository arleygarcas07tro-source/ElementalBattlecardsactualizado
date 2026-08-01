import Phaser from "phaser";

export default class HomeScenes extends Phaser.Scene {
    constructor() {
        super("HomeScenes");
        this.playerData = null;
        this.settings = {
            musicVolume: 80,
            effectsVolume: 65,
            accountLinked: false
        };
    }

    init(data) {
        this.playerData = data.playerData || data || {};
    }

    preload() {
        this.load.video("menu principal fondo", "/assets/images/menu%20principal/menu%20principal%20fondo.mp4", { muted: true });
    }

    create() {
        const { width, height } = this.scale;

        // BACKGROUND
        this.bg = this.add.video(width / 2, height / 2, 'menu principal fondo').setOrigin(0.5);
        this.bg.setDepth(-1); // Poner el video al fondo

        // Esperar a que el video esté listo para escalar correctamente
        this.bg.on('play', () => {
            const scaleX = width / this.bg.width;
            const scaleY = height / this.bg.height;
            const scale = Math.max(scaleX, scaleY);
            this.bg.setScale(scale);
        });

        this.bg.once('ready', () => {
            const videoEl = this.bg.video;

            if (!videoEl) {
                return;
            }

            videoEl.muted = true;
            videoEl.loop = false;
            videoEl.playbackRate = 1;

            const handleTimeUpdate = () => {
                if (!videoEl.duration || Number.isNaN(videoEl.duration)) {
                    return;
                }

                const threshold = 0.05;

                if (videoEl.playbackRate > 0 && videoEl.currentTime >= videoEl.duration - threshold) {
                    videoEl.currentTime = videoEl.duration - threshold;
                    videoEl.playbackRate = -1;
                } else if (videoEl.playbackRate < 0 && videoEl.currentTime <= threshold) {
                    videoEl.currentTime = threshold;
                    videoEl.playbackRate = 1;
                }
            };

            videoEl.addEventListener('timeupdate', handleTimeUpdate);
            videoEl.play().catch(() => {});
        });

        this.bg.play(false);

        const cards = [
            {
                eyebrow: 'Explora',
                title: "Niveles",
                desc: "Abre la selección de niveles y enfréntate a nuevos desafíos.",
                image: "/assets/images/mod%C3%BAlos%20menuprincipal/niveles%20fondo.jpeg",
                icon: "⭐"
            },
            {
                eyebrow: 'Multijugador',
                title: "Juego LAN",
                desc: "Inicia la conexión LAN y enfréntate a otros jugadores.",
                image: "/assets/images/mod%C3%BAlos%20menuprincipal/juego%20en%20linea.jpeg",
                icon: "⚡"
            },
            {
                eyebrow: 'Aprende',
                title: "Mecánicas",
                desc: "Consulta las reglas, ventajas y estrategias del juego.",
                image: "/assets/images/mod%C3%BAlos%20menuprincipal/mecanicas%20fondo.jpeg",
                icon: "📖"
            }
        ];

        const cardsHtml = cards.map((card, index) => `
            <div class="card" data-index="${index}">
                <img src="${card.image}" class="card-image" />
                <div class="overlay"></div>
                <div class="content">
                    <span class="eyebrow">${card.eyebrow}</span>
                    <h3>${card.title}</h3>
                    <p>${card.desc}</p>
                    <div class="icon" aria-hidden="true">${card.icon}</div>
                </div>
            </div>
        `).join('');

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
            
            /* HEADER BUTTONS */
            .header-actions {
                display: flex;
                align-items: center;
                gap: 14px;
            }
            .header-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                color: white;
                padding: 8px 14px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                transition: transform 180ms ease, background 180ms ease;
            }
            .header-btn:hover {
                background: rgba(255,255,255,0.12);
                transform: translateY(-2px);
            }
            .btn-exit {
                background: #b90000;
                border: 1px solid #8a0000;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                color: white;
                font-weight: bold;
                transition: transform 180ms ease, background 180ms ease;
            }
            .btn-exit:hover {
                background: #d60000;
                transform: translateY(-2px);
            }

            /* MAIN CONTENT */
            .main {
                flex: 1;
                display: flex;
                padding: 2vh 2vw;
                gap: 2vw;
                overflow: hidden;
            }

            /* USER PROFILE PANEL */
            .user-panel {
                display: flex;
                flex-direction: column;
                width: 200px;
                background: rgba(0,0,0,0.35);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                padding: 20px;
                gap: 16px;
                backdrop-filter: blur(8px);
            }

            .user-profile {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                gap: 10px;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                padding-bottom: 16px;
            }

            .user-avatar {
                width: 60px;
                height: 60px;
                border-radius: 12px;
                background: linear-gradient(135deg, #2b8fef, #183f8a);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                border: 2px solid rgba(255,255,255,0.15);
            }

            .user-name {
                font-weight: 700;
                font-size: 14px;
                color: white;
                margin: 0;
            }

            .user-rank {
                font-size: 12px;
                color: rgba(255,255,255,0.7);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin: 0;
            }

            .user-stats {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .stat-block {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: rgba(255,255,255,0.75);
            }

            .stat-block strong {
                color: rgba(241,231,188,0.9);
                font-weight: 700;
                font-size: 13px;
            }

            .stat-label {
                text-transform: uppercase;
                letter-spacing: 0.04em;
                font-size: 11px;
            }

            .progress-bar-small {
                width: 100%;
                height: 6px;
                background: rgba(255,255,255,0.08);
                border-radius: 3px;
                overflow: hidden;
            }

            .progress-fill-small {
                height: 100%;
                background: linear-gradient(90deg, #2b8fef, #1a5fc4);
                border-radius: 3px;
                width: 82%;
            }

            /* MAIN CONTENT */
            .main-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 2rem;
                overflow-y: auto;
            }
                padding: 24px;
                display: flex;
                flex-direction: column;
                height: auto;
                max-height: 100%;
                box-shadow: 0 0 12px rgba(0,0,0,0.55);
            }

            .stats-panel {
                display: flex;
                flex-direction: column;
                height: auto;
                width: 100%;
                max-width: 400px;
                align-self: flex-end;
                margin-top: auto;
            }

            h2 { margin: 0; font-size: 28px; }
            p { margin: 0 0 18px 0; }

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
                transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms, filter 180ms;
                will-change: transform;
            }

            .cards {
                display: flex;
                gap: 2rem;
                justify-content: flex-start;
                align-items: stretch;
                flex-wrap: wrap;
                margin: 0;
            }

            .card {
                position: relative;
                width: 320px;
                height: 480px;
                border-radius: 20px;
                overflow: hidden;
                cursor: pointer;
                transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s ease, filter .35s ease;
                background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.3));
                border: 1px solid rgba(255,255,255,0.12);
                box-shadow: 0 8px 32px rgba(0,0,0,0.4), 
                            0 0 40px rgba(138,0,255,0.1),
                            inset 0 0 30px rgba(255,255,255,0.02);
                backdrop-filter: blur(2px);
            }

            .card::before {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: 20px;
                padding: 2px;
                pointer-events: none;
                background: linear-gradient(90deg, rgba(24,150,255,0.08), rgba(138,0,255,0.08));
                -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
            }

            .card:hover {
                transform: translateY(-16px) scale(1.02);
                box-shadow: 0 16px 56px rgba(0,0,0,0.5), 
                            0 0 60px rgba(138,0,255,0.25),
                            inset 0 0 30px rgba(255,255,255,0.03);
                filter: brightness(1.08);
            }

            .card-image {
                position: absolute;
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform .6s ease, filter .4s ease;
                filter: brightness(0.6) saturate(1.05) contrast(1.02);
            }

            .card:hover .card-image {
                transform: scale(1.06);
                filter: brightness(0.72) saturate(1.06) contrast(1.04);
            }

            .overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(
                    to top,
                    rgba(3,6,12,0.9) 20%,
                    rgba(3,6,12,0.5) 45%,
                    rgba(3,6,12,0.18) 70%,
                    rgba(3,6,12,0.0) 100%
                );
            }

            .content {
                position: absolute;
                bottom: 36px;
                left: 28px;
                right: 28px;
                color: white;
                text-align: left;
            }

            .eyebrow {
                display: block;
                font-size: 12px;
                letter-spacing: .12em;
                text-transform: uppercase;
                color: rgba(255,255,255,0.65);
                margin-bottom: 8px;
            }

            .card h3 {
                margin: 0 0 12px 0;
                font-size: 28px;
                line-height: 1.05;
                letter-spacing: 0.02em;
                color: #fff;
            }

            .card p {
                color: rgba(255,255,255,0.78);
                font-size: 15px;
                margin: 0 0 18px 0;
                max-width: 85%;
            }

            .icon {
                width: 64px;
                height: 64px;
                display: inline-flex;
                justify-content: center;
                align-items: center;
                border-radius: 14px;
                background: rgba(0,0,0,0.35);
                border: 1px solid rgba(255,255,255,0.08);
                color: #fff;
                font-size: 28px;
            }

            /* color accents for each card (by data-index) */
            .card[data-index="0"] .icon { background: linear-gradient(180deg,#2b8fef,#183f8a); box-shadow: 0 6px 18px rgba(43,143,239,0.12); }
            .card[data-index="1"] .icon { background: linear-gradient(180deg,#24d0ff,#003a5a); box-shadow: 0 6px 18px rgba(36,208,255,0.10); }
            .card[data-index="2"] .icon { background: linear-gradient(180deg,#2be48a,#0b5231); box-shadow: 0 6px 18px rgba(43,228,138,0.10); }

            .card-image {
                position: absolute;
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform .6s ease, filter .4s ease;
                filter: brightness(0.6) saturate(1.05) contrast(1.02);
            }

            .card:hover .card-image {
                transform: scale(1.06);
                filter: brightness(0.72) saturate(1.06) contrast(1.04);
            }

            .overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(
                    to top,
                    rgba(3,6,12,0.9) 20%,
                    rgba(3,6,12,0.5) 45%,
                    rgba(3,6,12,0.18) 70%,
                    rgba(3,6,12,0.0) 100%
                );
            }

            .content {
                position: absolute;
                bottom: 36px;
                left: 28px;
                right: 28px;
                color: white;
                text-align: left;
            }

            .eyebrow {
                display: block;
                font-size: 12px;
                letter-spacing: .12em;
                text-transform: uppercase;
                color: rgba(255,255,255,0.65);
                margin-bottom: 8px;
            }

            .card h3 {
                margin: 0 0 12px 0;
                font-size: 28px;
                line-height: 1.05;
                letter-spacing: 0.02em;
                color: #fff;
            }

            .card p {
                color: rgba(255,255,255,0.78);
                font-size: 15px;
                margin: 0 0 18px 0;
                max-width: 85%;
            }

            /* Button animations */
            @keyframes subtle-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }
            .btn-primary.pulse { animation: subtle-pulse 3.8s ease-in-out infinite; }
            .btn-primary.animated, .btn-exit.animated, .btn-close.animated { backface-visibility: hidden; }
            .btn-primary:hover, .btn-exit:hover, .btn-close:hover {
                transform: translateY(-4px) scale(1.03);
                box-shadow: 0 8px 20px rgba(0,0,0,0.35);
            }
            .btn-primary:active, .btn-exit:active, .btn-close:active { transform: translateY(0) scale(0.98); }

            /* BOTTOM ACTION BUTTONS */
            .bottom-actions {
                display: flex;
                gap: 12px;
                padding: 16px 0;
                border-top: 1px solid rgba(255,255,255,0.08);
                justify-content: flex-start;
                margin-top: auto;
            }

            .bottom-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.12);
                color: rgba(255,255,255,0.9);
                padding: 12px 18px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
            }

            .bottom-btn:hover {
                background: rgba(255,255,255,0.1);
                border-color: rgba(255,255,255,0.2);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            .bottom-btn:active {
                transform: translateY(0);
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
            .modal--config {
                max-width: 760px;
                width: 90%;
            }
            .settings-panel {
                display: grid;
                gap: 22px;
            }
            .settings-section {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 18px;
                padding: 20px 20px 18px;
                display: grid;
                gap: 16px;
            }
            .section-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 4px;
            }
            .section-header h3 {
                margin: 0;
                font-size: 18px;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: #f1e7bc;
            }
            .section-icon {
                width: 36px;
                height: 36px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: rgba(241,231,188,0.16);
                font-size: 18px;
            }
            .setting-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 14px;
                flex-wrap: wrap;
            }
            .setting-label {
                color: rgba(255,255,255,0.82);
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                flex: 1 1 220px;
            }
            .slider-group {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 220px;
                flex: 1 1 320px;
            }
            .slider-group input[type=range] {
                width: 100%;
                accent-color: #f1e7bc;
            }
            .slider-value {
                min-width: 42px;
                text-align: right;
                font-weight: 700;
                color: #f1e7bc;
            }
            .account-card {
                background: rgba(0,0,0,0.16);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 18px;
                display: grid;
                gap: 14px;
            }
            .account-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                color: rgba(255,255,255,0.88);
            }
            .account-row strong {
                color: #fff;
                font-size: 14px;
            }
            .account-actions {
                display: flex;
                justify-content: flex-end;
            }
            .account-actions .btn-primary {
                margin: 0;
                width: auto;
                padding: 12px 18px;
                background: linear-gradient(135deg, #f5d86b, #e0b230);
                color: #1f1a0f;
                font-weight: 700;
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
                <div class="header-actions">
                    <button class="header-btn" data-modal="config">⚙️ Configuración</button>
                    <button class="header-btn" data-modal="about">ℹ️ Acerca de</button>
                    <button class="header-btn">💬 Mensajes</button>
                    <button class="btn-exit">Salir</button>
                </div>
            </header>

            <div class="main">
                <!-- USER PROFILE PANEL -->
                <div class="user-panel">
                    <div class="user-profile">
                        <div class="user-avatar">⚔️</div>
                        <h3 class="user-name">${(this.playerData && this.playerData.username) || "Meller2007"}</h3>
                        <p class="user-rank">Rango A</p>
                    </div>
                    <div class="user-stats">
                        <div class="stat-block">
                            <span class="stat-label">Experiencia</span>
                        </div>
                        <div class="progress-bar-small">
                            <div class="progress-fill-small"></div>
                        </div>
                        <div class="stat-block">
                            <span>820 / 1000</span>
                        </div>
                        <div style="margin-top: 8px;">
                            <div class="stat-block">
                                <span class="stat-label">Diamante IV</span>
                            </div>
                            <div class="stat-block">
                                <span>2,150 / 2,500 FP</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MAIN CONTENT -->
                <div class="main-content">
                    <div class="cards-header">
                        <p class="cards-subtitle">Pantalla Principal</p>
                        <h2 class="cards-title">Elige tu ruta de aventura</h2>
                        <p class="cards-description">Accede a niveles, partidas LAN y mecánicas desde un menú moderno con estética RPG.</p>
                    </div>
                    <div class="cards">
                        ${cardsHtml}
                    </div>
                    <div class="bottom-actions">
                        <button class="bottom-btn">📋 Cartas</button>
                        <button class="bottom-btn">🎯 Misiones</button>
                        <button class="bottom-btn" data-action="stats">📊 Estadísticas</button>
                    </div>
                </div>
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
        </div>
        <!-- Botón oculto para activar modal de mecánicas desde tarjeta -->
        <button data-modal="mechanics" style="display:none;"></button>
        </div>`;

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

        // Añadir clases de animación y manejadores de interacción a los botones
        try {
            const animatedBtns = node.querySelectorAll('.btn-primary, .btn-exit, .btn-close');
            animatedBtns.forEach((b, i) => {
                b.classList.add('animated');
                if (b.classList && b.classList.contains('btn-primary')) {
                    b.classList.add('pulse');
                    b.style.animationDelay = (Math.random() * 2) + 's';
                }
                b.addEventListener('pointerdown', () => { b.style.transform = 'translateY(0) scale(0.98)'; });
                b.addEventListener('pointerup', () => { b.style.transform = ''; });
                b.addEventListener('pointerleave', () => { b.style.transform = ''; });
            });
        } catch (e) {
            // seguridad: si el DOM no está disponible, ignorar
            console.warn('No se pudieron inicializar animaciones de botones', e);
        }

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
        const btnStats = node.querySelector('[data-action="stats"]');

        if (btnStats) btnStats.addEventListener('click', () => {
            this.scene.start('StatsScene', {
                playerData: this.playerData,
                returnScene: 'HomeScenes',
                stats: {
                    gamesPlayed: 0,
                    gamesWon: 0,
                    winRate: '0%',
                    achievements: '0/50',
                    timePlayed: '0h 0m',
                    totalTimePlayed: 0,
                    lastGameResult: 'N/A',
                    longestWinStreak: 0,
                    currentWinStreak: 0
                }
            });
        });

        if (btnConfig) btnConfig.addEventListener('click', () => {
            this.scene.start('SettingsScene', {
                playerData: this.playerData,
                returnScene: 'HomeScenes',
                settings: this.settings
            });
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

        // Conectar acciones a las tarjetas
        try {
            const cardEls = node.querySelectorAll('.card');
            cardEls.forEach((el) => {
                el.style.cursor = 'pointer';
                el.addEventListener('click', () => {
                    const idx = Number(el.getAttribute('data-index'));

                    if (idx === 0) {
                        console.log('Ir a selección de niveles desde la tarjeta Niveles...');
                        this.scene.start('DifficultySelectScene', { playerData: this.playerData });
                        return;
                    }

                    if (idx === 1) {
                        console.log('Abrir creación de sala (LAN) desde tarjeta...');
                        this.scene.start('CreateRoomScene', { playerData: this.playerData });
                        return;
                    }

                    if (idx === 2) {
                        if (btnMechanics) btnMechanics.click();
                        return;
                    }
                });
            });
        } catch (e) {
            console.warn('No se pudieron asignar listeners a las tarjetas', e);
        }

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