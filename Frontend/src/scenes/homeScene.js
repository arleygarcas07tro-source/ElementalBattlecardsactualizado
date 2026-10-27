import { startMenuMusic, play as playSfx } from '../helpers/audioManager.js';
import { getProfileStats } from '../helpers/playerProgress.js';
import DomSceneBase from './ui/DomSceneBase.js';
import { loadVideoIfNeeded, createVideoBackground } from './ui/videoBackground.js';
import { energyParticlesHTML } from './ui/elementCatalog.js';
import { MENU_MODULES as cards } from '../content/menuModules.js';

export default class HomeScenes extends DomSceneBase {
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
        // El video del menú ya NO se precarga en PreloaderScene (pesaba en la entrada
        // al juego). Se descarga aquí, una sola vez, y queda en caché para que al
        // volver a esta escena no haya recorte/negro por recarga de red.
        loadVideoIfNeeded(this, 'menu-bg-video', "/assets/images/menu%20principal/anmenuPrincipal.mp4");
    }

    create() {
        // BACKGROUND
        // Fondo de video inmediato con rectángulo de respaldo para que nunca se vea
        // un hueco negro mientras el video (aunque venga de caché) prepara su frame.
        this.bg = createVideoBackground(this, 'menu-bg-video', 0x0f0a1a);

        // Música ambiental del menú (procedural, bucle continuo sin cortes).
        startMenuMusic(this);

        // Datos reales del perfil para el panel izquierdo.
        const username = (this.playerData && this.playerData.username) || 'Jugador';
        const stats = getProfileStats(username);
        const xpPercent = Math.min(100, Math.round((stats.xpActual / stats.xpMaxima) * 100));

        const cardsHtml = cards.map((card, index) => `
            <div class="card" data-index="${index}" style="--card-accent:${card.accent}; --card-glow:${card.glow};">
                <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
                <img src="${card.image}" class="card-image" />
                <div class="overlay"></div>
                <div class="content">
                    <span class="eyebrow">${card.eyebrow}</span>
                    <h3>${card.title}</h3>
                    <p>${card.desc}</p>
                </div>
                <div class="card-edge"></div>
            </div>
        `).join('');

        const energy = energyParticlesHTML({
            count: 8,
            leftOffset: 6, leftSlope: 47, leftMod: 88,
            topOffset: 10, topSlope: 61, topMod: 70,
            delayStep: -1.6
        });

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
                font-family: Poppins, 'Segoe UI', Arial, sans-serif;
                overflow: hidden;
                transition: filter 160ms ease;
                background: linear-gradient(180deg, rgba(6, 8, 22, 0.55), rgba(6, 8, 22, 0.35) 40%, rgba(6, 8, 22, 0.45) 78%, rgba(4, 5, 16, 0.72));
            }

            .wrap::before {
                content: "";
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 1;
                background:
                    radial-gradient(900px 420px at 14% -4%, rgba(108, 76, 235, 0.16), transparent 55%),
                    radial-gradient(820px 460px at 92% 102%, rgba(92, 196, 255, 0.12), transparent 56%);
            }

            .energy {
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
                z-index: 1;
                background: #8fb7ff;
                box-shadow: 0 0 12px 3px rgba(143, 183, 255, 0.35);
                animation: rise 10s ease-in-out infinite alternate;
                opacity: 0.30;
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
                padding: 18px 28px 12px;
            }
            .logo-box { display: flex; align-items: center; gap: 14px; }
            .logo {
                width: 54px;
                height: 54px;
                border-radius: 14px;
                object-fit: cover;
                box-shadow: 0 6px 22px rgba(0,0,0,0.5), 0 0 0 2px rgba(230, 200, 115, 0.35), 0 0 22px rgba(230, 200, 115, 0.12);
            }
            .brand-title {
                margin: 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 22px;
                font-weight: 800;
                letter-spacing: 0.05em;
                background: linear-gradient(180deg, #fff4d6, #e6c873);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .brand-sub {
                font-size: 11.5px;
                color: rgba(255, 255, 255, 0.66);
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }

            /* HEADER BUTTONS */
            .header-actions { display: flex; align-items: center; gap: 10px; }
            .header-btn {
                position: relative;
                display: flex;
                align-items: center;
                gap: 7px;
                appearance: none;
                background: linear-gradient(160deg, rgba(10, 18, 48, 0.72), rgba(6, 10, 30, 0.72));
                border: 1px solid rgba(230, 200, 115, 0.5);
                color: #f5ecd2;
                padding: 10px 18px;
                border-radius: 12px;
                cursor: pointer;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.03em;
                backdrop-filter: blur(8px);
                box-shadow: inset 0 0 18px rgba(143, 183, 255, 0.07), 0 0 16px rgba(230, 200, 115, 0.07);
                transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
            }
            .header-btn:hover {
                background: linear-gradient(160deg, rgba(16, 28, 70, 0.8), rgba(10, 18, 48, 0.78));
                border-color: rgba(241, 200, 106, 0.75);
                transform: translateY(-2px);
                box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35), 0 0 24px rgba(230, 200, 115, 0.16), inset 0 0 20px rgba(143, 183, 255, 0.08);
            }
            .header-btn .notif-dot {
                width: 7px; height: 7px;
                border-radius: 50%;
                background: #f1c86a;
                box-shadow: 0 0 8px rgba(241, 200, 106, 0.9);
            }
            .btn-exit {
                position: relative;
                display: flex;
                align-items: center;
                gap: 7px;
                appearance: none;
                background: linear-gradient(160deg, rgba(58, 18, 34, 0.62), rgba(10, 14, 34, 0.7));
                border: 1px solid rgba(230, 200, 115, 0.4);
                color: #ffd9d9;
                padding: 10px 20px;
                border-radius: 12px;
                cursor: pointer;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.03em;
                box-shadow: inset 0 0 18px rgba(255, 120, 120, 0.06), 0 0 14px rgba(230, 200, 115, 0.06);
                transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
            }
            .btn-exit:hover {
                background: linear-gradient(160deg, rgba(120, 30, 48, 0.7), rgba(40, 20, 44, 0.75));
                transform: translateY(-2px);
                box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35), 0 0 22px rgba(255, 122, 122, 0.14);
            }

            /* ESQUINAS ORNAMENTALES DORADAS (botones) */
            .header-btn::before, .btn-exit::before, .bottom-btn::before, .btn-profile::before {
                content: "";
                position: absolute;
                top: -1px; left: -1px;
                width: 11px; height: 11px;
                border-top: 2px solid rgba(230, 200, 115, 0.9);
                border-left: 2px solid rgba(230, 200, 115, 0.9);
                border-top-left-radius: 11px;
                filter: drop-shadow(0 0 6px rgba(241, 200, 106, 0.7));
                pointer-events: none;
            }
            .header-btn::after, .btn-exit::after, .bottom-btn::after, .btn-profile::after {
                content: "";
                position: absolute;
                bottom: -1px; right: -1px;
                width: 11px; height: 11px;
                border-bottom: 2px solid rgba(230, 200, 115, 0.9);
                border-right: 2px solid rgba(230, 200, 115, 0.9);
                border-bottom-right-radius: 11px;
                filter: drop-shadow(0 0 6px rgba(241, 200, 106, 0.7));
                pointer-events: none;
            }

            /* MAIN CONTENT */
            .main {
                position: relative;
                z-index: 2;
                flex: 1;
                display: flex;
                padding: 4px 28px 14px;
                gap: 22px;
                overflow: hidden;
                min-height: 0;
            }

            /* USER PROFILE PANEL (izquierda) - tarjeta lateral compacta */
            .user-panel {
                display: flex;
                flex-direction: column;
                align-self: flex-start;
                width: 15%;
                flex: 0 0 15%;
                min-width: 168px;
                max-width: 240px;
                background: rgba(8, 11, 28, 0.66);
                border: 1px solid rgba(230, 200, 115, 0.22);
                border-radius: 14px;
                padding: 8px 12px 6px;
                gap: 6px;
                backdrop-filter: blur(10px);
                box-shadow: 0 20px 46px rgba(0, 0, 0, 0.4), inset 0 0 26px rgba(92, 196, 255, 0.03);
                overflow: hidden;
            }
            .user-panel::before {
                content: "";
                position: absolute;
                top: 0; left: 16%; right: 16%;
                height: 2px;
                background: linear-gradient(90deg, transparent, rgba(230, 200, 115, 0.7), transparent);
                box-shadow: 0 0 12px rgba(230, 200, 115, 0.4);
            }

            .user-avatar-wrap { position: relative; display: flex; justify-content: center; }
            .user-avatar-orb {
                width: 52px; height: 52px;
                border-radius: 50%;
                padding: 2px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: conic-gradient(from 0deg, #e6c873, #0b0a26 45%, #8fb7ff 72%, transparent 100%);
                box-shadow: 0 0 26px rgba(230, 200, 115, 0.22);
            }
            .user-avatar-orb img {
                width: 100%; height: 100%;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid rgba(4, 5, 16, 0.7);
            }
            .user-name {
                margin: 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 13px;
                font-weight: 700;
                color: #fff;
                text-align: center;
                letter-spacing: 0.02em;
            }
            .user-role {
                margin: 0;
                font-size: 8.5px;
                color: rgba(255, 255, 255, 0.6);
                text-align: center;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }

            .profile-stats { display: flex; flex-direction: column; gap: 5px; padding-top: 5px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
            .stat-line { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: rgba(255, 255, 255, 0.78); }
            .stat-line .label { text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; color: rgba(255, 255, 255, 0.52); }
            .stat-line .value { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 12px; color: #fff; }
            .value.gold { color: #f1c86a; text-shadow: 0 0 12px rgba(241, 200, 106, 0.35); }

            .xp-block { display: flex; flex-direction: column; gap: 3px; }
            .xp-top { display: flex; justify-content: space-between; font-size: 9px; color: rgba(255, 255, 255, 0.6); }
            .xp-bar {
                height: 7px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.07);
                border: 1px solid rgba(255, 255, 255, 0.10);
                overflow: hidden;
            }
            .xp-fill {
                width: 0%;
                height: 100%;
                border-radius: 999px;
                background: linear-gradient(90deg, #7d72ff, #8fb7ff);
                box-shadow: 0 0 12px rgba(143, 183, 255, 0.4);
                transition: width 900ms ease;
            }

            .btn-profile {
                position: relative;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                appearance: none;
                background: linear-gradient(160deg, rgba(14, 24, 60, 0.8), rgba(8, 14, 40, 0.8));
                border: 1px solid rgba(230, 200, 115, 0.45);
                color: #f1e7bc;
                padding: 5px 12px;
                border-radius: 9px;
                cursor: pointer;
                font-family: Poppins, Arial, sans-serif;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                margin-top: auto;
                box-shadow: inset 0 0 14px rgba(143, 183, 255, 0.08), 0 0 12px rgba(143, 183, 255, 0.10);
                transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
            }
            .btn-profile:hover {
                background: linear-gradient(160deg, rgba(20, 34, 82, 0.85), rgba(12, 20, 54, 0.85));
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), 0 0 18px rgba(143, 183, 255, 0.18);
            }
            .btn-profile:active { transform: translateY(0) scale(0.98); }

            /* MAIN CONTENT (centro) */
            .main-content {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 18px;
                overflow-y: auto;
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            .main-content::-webkit-scrollbar { display: none; }
            .cards-header { text-align: center; padding-top: 6px; }
            .cards-subtitle {
                margin: 0;
                font-size: 11px;
                letter-spacing: 0.22em;
                text-transform: uppercase;
                color: #f1c86a;
                opacity: 0.85;
            }
            .cards-title {
                margin: 6px 0 4px;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 34px;
                font-weight: 800;
                letter-spacing: 0.03em;
                background: linear-gradient(180deg, #fff4d6, #e8d291);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                filter: drop-shadow(0 2px 12px rgba(233, 185, 73, 0.25));
            }
            .cards-description {
                margin: 0 auto;
                max-width: 640px;
                font-size: 14px;
                line-height: 1.6;
                color: rgba(255, 255, 255, 0.72);
            }

            .cards {
                display: flex;
                gap: 22px;
                justify-content: center;
                align-items: stretch;
                flex-wrap: wrap;
                margin: 4px 0 0;
            }

            /* TARJETAS DE MÓDULOS */
            .card {
                position: relative;
                width: 320px;
                height: 432px;
                border-radius: 22px;
                overflow: hidden;
                cursor: pointer;
                background: linear-gradient(160deg, rgba(10, 18, 48, 0.68), rgba(6, 10, 30, 0.72));
                border: 1px solid rgba(230, 200, 115, 0.45);
                box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5), 0 0 24px rgba(230, 200, 115, 0.08), inset 0 0 34px rgba(143, 183, 255, 0.05);
                backdrop-filter: blur(3px);
                transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s ease, border-color .35s ease;
            }
            .card::before {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: 22px;
                padding: 2px;
                pointer-events: none;
                background: linear-gradient(90deg, rgba(241, 200, 106, 0.55), rgba(143, 183, 255, 0.35), rgba(241, 200, 106, 0.55));
                -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                -webkit-mask-composite: xor;
                mask-composite: exclude;
            }
            .card::after {
                content: "";
                position: absolute;
                top: 0; bottom: 0;
                width: 34%;
                left: -60%;
                background: linear-gradient(105deg, transparent, rgba(143, 183, 255, 0.16), rgba(108, 76, 235, 0.14), transparent);
                transform: skewX(-18deg);
                pointer-events: none;
                animation: card-sheen 6s ease-in-out infinite;
            }
            .card:hover::after { animation-duration: 3.2s; }
            .card-edge {
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 3px;
                background: linear-gradient(90deg, transparent, var(--card-accent), transparent);
                box-shadow: 0 0 18px var(--card-glow);
                opacity: 0.85;
                transition: opacity .35s ease;
            }
            .card:hover {
                transform: translateY(-14px) scale(1.02);
                box-shadow: 0 26px 64px rgba(0, 0, 0, 0.55), 0 0 44px var(--card-glow);
                border-color: rgba(241, 200, 106, 0.7);
            }
            .card:hover .card-edge { opacity: 1; }

            /* ESQUINAS ORNAMENTALES DORADAS (tarjetas) */
            .corner {
                position: absolute;
                width: 30px; height: 30px;
                pointer-events: none;
                z-index: 5;
                filter: drop-shadow(0 0 8px rgba(241, 200, 106, 0.8));
            }
            .corner.tl { top: 10px; left: 10px; border-top: 3px solid rgba(230, 200, 115, 0.95); border-left: 3px solid rgba(230, 200, 115, 0.95); border-top-left-radius: 14px; }
            .corner.tr { top: 10px; right: 10px; border-top: 3px solid rgba(230, 200, 115, 0.95); border-right: 3px solid rgba(230, 200, 115, 0.95); border-top-right-radius: 14px; }
            .corner.bl { bottom: 10px; left: 10px; border-bottom: 3px solid rgba(230, 200, 115, 0.95); border-left: 3px solid rgba(230, 200, 115, 0.95); border-bottom-left-radius: 14px; }
            .corner.br { bottom: 10px; right: 10px; border-bottom: 3px solid rgba(230, 200, 115, 0.95); border-right: 3px solid rgba(230, 200, 115, 0.95); border-bottom-right-radius: 14px; }

            .card-image {
                position: absolute;
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform .6s ease, filter .4s ease;
                filter: brightness(0.62) saturate(0.92) contrast(1.02);
            }
            .card:hover .card-image {
                transform: scale(1.06);
                filter: brightness(0.72) saturate(0.95) contrast(1.04);
            }
            .overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(
                    to top,
                    rgba(6, 10, 28, 0.95) 16%,
                    rgba(10, 18, 48, 0.62) 46%,
                    rgba(12, 20, 52, 0.34) 74%,
                    rgba(8, 14, 40, 0.16) 100%
                );
            }
            .content {
                position: absolute;
                bottom: 32px;
                left: 26px;
                right: 26px;
                color: white;
                text-align: left;
            }
            .eyebrow {
                display: block;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 12px;
                letter-spacing: .16em;
                text-transform: uppercase;
                color: #f1c86a;
                margin-bottom: 8px;
                text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
            }
            .card h3 {
                margin: 0 0 10px 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 29px;
                line-height: 1.05;
                letter-spacing: 0.02em;
                background: linear-gradient(180deg, #ffffff, #f1e7bc);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.55));
            }
            .card p {
                color: rgba(255, 255, 255, 0.88);
                font-size: 13.5px;
                line-height: 1.55;
                margin: 0 0 16px 0;
                max-width: 90%;
                text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
            }

            /* BOTTOM ACTIONS (Cartas / Misiones) */
            .bottom-actions {
                display: flex;
                justify-content: center;
                gap: 16px;
                padding: 10px 0 2px;
                margin-top: auto;
            }
            .bottom-btn {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                min-width: 250px;
                appearance: none;
                background: linear-gradient(160deg, rgba(10, 18, 48, 0.78), rgba(6, 10, 30, 0.82));
                border: 1px solid rgba(230, 200, 115, 0.5);
                color: #f5ecd2;
                padding: 16px 26px;
                border-radius: 16px;
                cursor: pointer;
                font-family: Poppins, Arial, sans-serif;
                font-weight: 700;
                font-size: 15px;
                letter-spacing: 0.08em;
                text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(8px);
                box-shadow: inset 0 0 22px rgba(143, 183, 255, 0.08), 0 0 22px rgba(143, 183, 255, 0.18), 0 10px 26px rgba(0, 0, 0, 0.4);
                transition: transform 180ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
            }
            .bottom-btn:hover {
                background: linear-gradient(160deg, rgba(16, 28, 70, 0.85), rgba(10, 16, 42, 0.85));
                border-color: rgba(241, 200, 106, 0.75);
                transform: translateY(-3px);
                box-shadow: inset 0 0 26px rgba(143, 183, 255, 0.12), 0 0 38px rgba(143, 183, 255, 0.30), 0 14px 30px rgba(0, 0, 0, 0.45);
            }
            .bottom-btn:active { transform: translateY(0); }
            .bottom-btn .btn-icon {
                width: 42px; height: 42px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                font-size: 18px;
                background: rgba(143, 183, 255, 0.12);
                border: 1px solid rgba(143, 183, 255, 0.45);
                box-shadow: 0 0 16px rgba(143, 183, 255, 0.25);
            }
            .bottom-btn.cards .btn-icon { background: rgba(143, 183, 255, 0.16); border-color: rgba(143, 183, 255, 0.55); box-shadow: 0 0 18px rgba(143, 183, 255, 0.30); }
            .bottom-btn.missions .btn-icon { background: rgba(241, 200, 106, 0.14); border-color: rgba(241, 200, 106, 0.45); box-shadow: 0 0 18px rgba(241, 200, 106, 0.22); }

            /* MODAL / OVERLAY */
            .modal-overlay {
                position: absolute;
                inset: 0;
                display: none;
                align-items: center;
                justify-content: center;
                background: rgba(3, 5, 16, 0.6);
                z-index: 10000;
                pointer-events: auto;
                backdrop-filter: blur(5px);
            }
            .modal-overlay.show { display: flex; }
            .modal {
                background: rgba(9, 12, 28, 0.96);
                color: white;
                padding: 26px 30px;
                border-radius: 20px;
                max-width: 460px;
                width: 90%;
                border: 1px solid rgba(230, 200, 115, 0.35);
                box-shadow: 0 14px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(230, 200, 115, 0.08);
                max-height: 80vh;
                overflow-y: auto;
            }
            .modal-title {
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 21px;
                font-weight: 700;
                color: #f1e7bc;
                margin-bottom: 10px;
            }
            .modal-body { margin-bottom: 18px; font-size: 14px; line-height: 1.7; color: rgba(255, 255, 255, 0.85); }
            .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
            .btn-close {
                appearance: none;
                padding: 10px 18px;
                border-radius: 11px;
                border: 1px solid rgba(230, 200, 115, 0.4);
                background: rgba(230, 200, 115, 0.12);
                color: #f1e7bc;
                cursor: pointer;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13px;
                font-weight: 600;
                transition: transform 160ms ease, background 160ms ease;
            }
            .btn-close:hover { background: rgba(230, 200, 115, 0.22); transform: translateY(-2px); }

            /* BUTTON ANIMATIONS */
            @keyframes subtle-pulse { 0% { transform: scale(1);} 50% { transform: scale(1.02);} 100% { transform: scale(1);} }
            @keyframes rise { 0% { transform: translateY(0) scale(1); opacity: 0.2; } 100% { transform: translateY(-60px) scale(1.4); opacity: 0.5; } }
            @keyframes card-sheen { 0% { left: -60%; } 55%, 100% { left: 130%; } }
            .btn-primary.pulse { animation: subtle-pulse 3.8s ease-in-out infinite; }
            .btn-primary.animated, .btn-exit.animated, .btn-close.animated { backface-visibility: hidden; }
            .btn-primary:hover, .btn-exit:hover, .btn-close:hover {
                transform: translateY(-4px) scale(1.03);
                box-shadow: 0 8px 20px rgba(0,0,0,0.35);
            }
            .btn-primary:active, .btn-exit:active, .btn-close:active { transform: translateY(0) scale(0.98); }

            @media (max-width: 1080px) {
                .user-panel { width: 17%; flex: 0 0 17%; min-width: 160px; }
                .card { width: 260px; height: 360px; }
            }
            @media (max-width: 860px) {
                .main { flex-direction: column; overflow-y: auto; }
                .user-panel { width: 100%; flex: none; flex-direction: row; align-items: center; gap: 16px; }
                .user-panel .btn-profile { margin-top: 0; }
                .profile-stats { border-top: none; padding-top: 0; min-width: 200px; }
                .bottom-btn { min-width: 0; flex: 1; }
            }
        </style>

        <div class="wrap">
            ${energy}

            <header class="header">
                <div class="logo-box">
                    <img class="logo" src="/assets/images/logotipomenu.jpg" alt="Elemental Battlecards">
                    <div>
                        <h1 class="brand-title">Elemental Battlecards</h1>
                        <span class="brand-sub">Bienvenido, ${username}</span>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="header-btn" data-modal="config">Configuración</button>
                    <button class="header-btn" data-modal="about">Acerca de</button>
                    <button class="header-btn" data-modal="notifications">Notificaciones <span class="notif-dot"></span></button>
                    <button type="button" class="btn-exit">Salir</button>
                </div>
            </header>

            <div class="main">
                <!-- USER PROFILE PANEL -->
                <aside class="user-panel">
                    <div>
                        <div class="user-avatar-wrap">
                            <div class="user-avatar-orb">
                                <img src="/assets/images/logo.png" alt="Avatar">
                            </div>
                        </div>
                        <h3 class="user-name">${username}</h3>
                        <p class="user-role">${stats.ranking}</p>
                    </div>

                    <div class="profile-stats">
                        <div class="stat-line">
                            <span class="label">Nivel</span>
                            <span class="value gold">${stats.nivel}</span>
                        </div>
                        <div class="stat-line">
                            <span class="label">Rango</span>
                            <span class="value">${stats.ranking}</span>
                        </div>
                        <div class="stat-line">
                            <span class="label">Victorias</span>
                            <span class="value">${stats.battlesWon}</span>
                        </div>
                        <div class="xp-block">
                            <div class="xp-top">
                                <span>Experiencia</span>
                                <span>${stats.xpActual} / ${stats.xpMaxima} XP</span>
                            </div>
                            <div class="xp-bar"><div class="xp-fill" id="xp-fill"></div></div>
                        </div>
                    </div>

                    <button class="btn-profile" data-action="profile">Ver Perfil</button>
                </aside>

                <!-- MAIN CONTENT -->
                <section class="main-content">
                    <div class="cards-header">
                        <p class="cards-subtitle">Pantalla Principal</p>
                        <h2 class="cards-title">Elige tu ruta de aventura</h2>
                        <p class="cards-description">Accede a niveles, partidas LAN y mecánicas.</p>
                    </div>
                    <div class="cards">
                        ${cardsHtml}
                    </div>
                    <div class="bottom-actions">
                        <button class="bottom-btn cards" data-action="cards">
                             Cartas
                        </button>
                        <button class="bottom-btn missions" data-action="missions">
                             Misiones
                        </button>
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
        </div>
        </div>`;

        // DOM ELEMENT
        const node = this.mountDOM(html);

        // Añadir clases de animación y manejadores de interacción a los botones
        try {
            const animatedBtns = node.querySelectorAll('.btn-primary, .btn-exit, .btn-close');
            animatedBtns.forEach((b, _i) => {
                b.classList.add('animated');
                if (b.classList && b.classList.contains('btn-primary')) {
                    b.classList.add('pulse');
                    b.style.animationDelay = (Math.random() * 2) + 's';
                }
                this.track(b, () => { b.style.transform = 'translateY(0) scale(0.98)'; }, 'pointerdown');
                this.track(b, () => { b.style.transform = ''; }, 'pointerup');
                this.track(b, () => { b.style.transform = ''; }, 'pointerleave');
            });
        } catch (e) {
            console.warn('No se pudieron inicializar animaciones de botones', e);
        }

        // Efectos de sonido de clic en todos los elementos interactivos.
        try {
            const clickables = node.querySelectorAll('.header-btn, .btn-exit, .bottom-btn, .btn-profile, .card');
            clickables.forEach(el => {
                this.track(el, () => playSfx('click', this), 'pointerup');
            });
        } catch (e) {
            console.warn('No se pudieron conectar sonidos de clic', e);
        }

        // --- LÓGICA DE LOS BOTONES ---
        // EXIT BUTTON
        const exitBtn = node.querySelector(".btn-exit");
        if (exitBtn) this.track(exitBtn, (event) => {
            event.preventDefault();
            this.scene.start('LoginScene');
        }, 'click');

        // Modal elements and helpers
        const modalOverlay = node.querySelector('#scene-modal');
        const modalTitle = node.querySelector('#modal-title');
        const modalBody = node.querySelector('#modal-body');
        const modalClose = node.querySelector('#modal-close');
        const wrap = node.querySelector('.wrap');

        const openModal = (title, htmlContent) => {
            if (!modalOverlay || !wrap) return;
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
        };

        if (modalClose) this.track(modalClose, closeModal, 'click');
        if (modalOverlay) this.track(modalOverlay, (e) => {
            if (e.target === modalOverlay) closeModal();
        }, 'click');

        // ESC para cerrar modal
        this.input.keyboard.on('keydown-ESC', () => {
            closeModal();
        });

        // Asignar acciones distintas por botón
        const btnConfig = node.querySelector('[data-modal="config"]');
        const btnAbout = node.querySelector('[data-modal="about"]');
        const btnNotifications = node.querySelector('[data-modal="notifications"]');
        const btnProfile = node.querySelector('[data-action="profile"]');
        const btnCards = node.querySelector('[data-action="cards"]');
        const btnMissions = node.querySelector('[data-action="missions"]');

        if (btnProfile) this.track(btnProfile, () => {
            this.scene.start('ProfileScene', { playerData: this.playerData });
        }, 'click');

        if (btnCards) this.track(btnCards, () => {
            this.scene.start('CardsScene', { playerData: this.playerData });
        }, 'click');

        if (btnMissions) this.track(btnMissions, () => {
            this.scene.start('MissionsScene', { playerData: this.playerData });
        }, 'click');

        if (btnConfig) this.track(btnConfig, () => {
            this.scene.start('SettingsScene', {
                playerData: this.playerData,
                returnScene: 'HomeScenes',
                settings: this.settings
            });
        }, 'click');
        if (btnAbout) this.track(btnAbout, () => {
            this.scene.start('AboutScene', { playerData: this.playerData });
        }, 'click');
        if (btnNotifications) this.track(btnNotifications, () => {
            openModal('Notificaciones',
                '<p>No tienes notificaciones nuevas por ahora.</p><p style="color:rgba(255,255,255,0.6);">Cuando ganes batallas, completen misiones o haya eventos, lo verás aquí.</p>');
        }, 'click');

        // Conectar acciones a las tarjetas
        try {
            const cardEls = node.querySelectorAll('.card');
            cardEls.forEach((el) => {
                el.style.cursor = 'pointer';
                this.track(el, () => {
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
                        this.scene.start('MechanicsScene', { playerData: this.playerData });
                        return;
                    }
                }, 'click');
            });
        } catch (e) {
            console.warn('No se pudieron asignar listeners a las tarjetas', e);
        }

        // Animación de la barra de experiencia al entrar.
        const xpFill = node.querySelector('#xp-fill');
        if (xpFill) {
            setTimeout(() => {
                xpFill.style.width = xpPercent + '%';
            }, 120);
        }
    }

    onResize(gameSize) {
        const { width, height } = gameSize;

        if (this.bg) this.bg.setDisplaySize(width, height);

        super.onResize(gameSize);
    }
}