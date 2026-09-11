import Phaser from 'phaser';
import { setMusicVolume, setEffectsVolume, play as playSfx } from '../helpers/audioManager.js';

const ELEMENTS = [
    { key: 'agua',       name: 'Agua',       color: '#38bdf8', soft: 'rgba(56,189,248,0.14)',  glow: 'rgba(56,189,248,0.42)',  img: '/assets/images/iconos/agua.jpeg' },
    { key: 'fuego',      name: 'Fuego',      color: '#fb5a2a', soft: 'rgba(251,90,42,0.14)',   glow: 'rgba(251,90,42,0.42)',   img: '/assets/images/iconos/fuego.jpeg' },
    { key: 'aire',       name: 'Aire',       color: '#6fe3ff', soft: 'rgba(111,227,255,0.14)', glow: 'rgba(111,227,255,0.42)', img: '/assets/images/iconos/luz.jpeg' },
    { key: 'tierra',     name: 'Tierra',     color: '#a78bfa', soft: 'rgba(167,139,250,0.14)', glow: 'rgba(167,139,250,0.42)', img: '/assets/images/iconos/espiritu.jpeg' },
    { key: 'naturaleza', name: 'Naturaleza', color: '#34d97b', soft: 'rgba(52,217,123,0.14)',  glow: 'rgba(52,217,123,0.42)',  img: '/assets/images/iconos/planta.jpeg' },
    { key: 'oscuridad',  name: 'Oscuridad',  color: '#c026d3', soft: 'rgba(192,38,211,0.16)',  glow: 'rgba(192,38,211,0.45)',  img: '/assets/images/iconos/sombra.jpeg' }
];

export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
        this.playerData = {};
        this.returnScene = 'HomeScenes';
        this.settings = {
            musicVolume: 80,
            effectsVolume: 70,
            accountLinked: false
        };
        this.listeners = [];
    }

    init(data) {
        this.playerData = data.playerData || {};
        this.returnScene = data.returnScene || 'HomeScenes';
        this.settings = {
            ...this.settings,
            ...(data.settings || {})
        };
    }

    create() {
        const { width, height } = this.scale;

        const particles = Array.from({ length: 10 }, (_, i) => {
            const left = Math.round(4 + ((i * 37) % 92));
            const top = Math.round(8 + ((i * 53) % 70));
            const size = 3 + (i % 3) * 2;
            const delay = (i % 6) * -1.4;
            return `<span class="energy" style="left:${left}%; top:${top}%; width:${size}px; height:${size}px; animation-delay:${delay}s;"></span>`;
        }).join('');

        const elementsNavHtml = ELEMENTS.map(el => `
            <span class="nav-orb" style="--el:${el.color}; --el-soft:${el.soft};" title="${el.name}">
                <img src="${el.img}" alt="${el.name}">
            </span>
        `).join('');

        const accountStatusLabel = this.settings.accountLinked
            ? 'Vinculado'
            : `Invitado (ID: #${this.playerData?.id || this.playerData?._id || '48291'})`;

        const html = `
        <style>
            :host { box-sizing: border-box; }
            .screen {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                color: white;
                font-family: Poppins, 'Segoe UI', Arial, sans-serif;
                background:
                    radial-gradient(1200px 640px at 18% -6%, rgba(138, 0, 255, 0.20), transparent 58%),
                    radial-gradient(1000px 560px at 88% 8%, rgba(43, 143, 239, 0.16), transparent 55%),
                    radial-gradient(1400px 900px at 50% 118%, rgba(255, 176, 64, 0.10), transparent 60%),
                    linear-gradient(180deg, #06081a 0%, #0c0a26 46%, #081026 100%);
            }

            /* ---------- FONDO: montañas, islas y energía ---------- */
            .bg-layer { position: absolute; inset: 0; pointer-events: none; }
            .mountains {
                position: absolute;
                left: 0; right: 0; bottom: 74px;
                height: 230px;
                opacity: 0.5;
                background: linear-gradient(180deg, rgba(30, 16, 58, 0) 0%, rgba(24, 14, 58, 0.55) 60%, rgba(60, 24, 96, 0.85) 100%);
                clip-path: polygon(0 58%, 7% 34%, 14% 56%, 24% 18%, 33% 50%, 42% 26%, 51% 54%, 61% 22%, 72% 52%, 82% 30%, 91% 55%, 100% 40%, 100% 100%, 0 100%);
                filter: drop-shadow(0 0 24px rgba(138, 0, 255, 0.25));
            }
            .horizon-glow {
                position: absolute;
                left: 50%; bottom: 70px;
                transform: translateX(-50%);
                width: 78%; height: 120px;
                background: radial-gradient(ellipse at center, rgba(110, 240, 255, 0.20), transparent 70%);
                filter: blur(6px);
            }
            .island {
                position: absolute;
                opacity: 0.42;
                clip-path: polygon(14% 46%, 30% 22%, 52% 30%, 74% 16%, 90% 44%, 82% 76%, 22% 82%);
                background: linear-gradient(180deg, #241457, #0b0a26);
                filter: drop-shadow(0 0 18px rgba(110, 240, 255, 0.22)) drop-shadow(0 14px 22px rgba(0,0,0,0.45));
                animation: floatY 15s ease-in-out infinite;
            }
            .island::after {
                content: "";
                position: absolute;
                left: 20%; right: 20%; bottom: -6px;
                height: 12px;
                background: radial-gradient(ellipse, rgba(110, 240, 255, 0.55), transparent 70%);
                filter: blur(6px);
            }
            .island-1 { width: 230px; height: 90px; top: 62%; left: -40px; animation-delay: -4s; }
            .island-2 { width: 300px; height: 110px; top: 56%; right: -60px; background: linear-gradient(180deg, #3a1158, #0b0a26); animation-delay: -9s; }
            .energy {
                position: absolute;
                border-radius: 50%;
                background: #7fe8ff;
                box-shadow: 0 0 12px 3px rgba(127, 232, 255, 0.65);
                animation: rise 9s ease-in-out infinite alternate;
                opacity: 0.25;
            }
            .screen::before {
                content: "";
                position: absolute; inset: 0;
                background: repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 4px);
                pointer-events: none;
            }

            /* ---------- CORNER BRACKETS (detalle tecnológico) ---------- */
            .hud { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
            .hud::before, .hud::after {
                content: "";
                position: absolute;
                width: 46px; height: 46px;
                border: 2px solid rgba(255, 215, 90, 0.35);
                border-radius: 6px;
                filter: drop-shadow(0 0 8px rgba(255, 215, 90, 0.3));
            }
            .hud::before { top: 58px; left: 14px; border-right: none; border-bottom: none; }
            .hud::after { bottom: 58px; right: 14px; border-left: none; border-top: none; }

            /* ---------- TOPBAR ---------- */
            .topbar {
                position: relative;
                z-index: 3;
                display: flex;
                align-items: center;
                gap: 26px;
                padding: 16px 30px 12px;
            }
            .brand { display: flex; align-items: center; gap: 16px; }
            .brand .logo {
                width: 58px; height: 58px;
                border-radius: 14px;
                object-fit: cover;
                border: 2px solid rgba(255, 215, 90, 0.5);
                box-shadow: 0 6px 24px rgba(0,0,0,0.5), 0 0 26px rgba(255, 215, 90, 0.16);
            }
            .brand-block { line-height: 1.15; }
            .brand-kicker {
                font-size: 10px;
                letter-spacing: 0.34em;
                text-transform: uppercase;
                color: #ffd75a;
                opacity: 0.85;
            }
            .brand h1 {
                margin: 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 34px;
                font-weight: 800;
                letter-spacing: 0.06em;
                background: linear-gradient(180deg, #fff3cf, #e9b949);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                filter: drop-shadow(0 2px 10px rgba(233, 185, 73, 0.35));
            }
            .brand-block p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.68); max-width: 560px; }
            .btn-home {
                margin-left: auto;
                display: inline-flex;
                align-items: center;
                gap: 9px;
                appearance: none;
                border: 1px solid rgba(255, 215, 90, 0.45);
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.14), rgba(255, 215, 90, 0.04));
                color: #ffd75a;
                font-family: Poppins, Arial, sans-serif;
                font-size: 14px;
                font-weight: 600;
                padding: 12px 20px;
                border-radius: 14px;
                cursor: pointer;
                box-shadow: 0 0 22px rgba(255, 215, 90, 0.10);
                transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
            }
            .btn-home:hover {
                transform: translateY(-2px);
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.24), rgba(255, 215, 90, 0.08));
                box-shadow: 0 0 30px rgba(255, 215, 90, 0.22);
            }

            /* ---------- CUERPO: menú izquierdo + panel principal ---------- */
            .settings-body {
                position: relative;
                z-index: 3;
                flex: 1;
                min-height: 0;
                display: grid;
                grid-template-columns: 300px minmax(0, 1fr);
                gap: 26px;
                padding: 6px 30px 18px;
            }
            .side-menu, .main-panel {
                position: relative;
                background: rgba(6, 8, 22, 0.72);
                backdrop-filter: blur(14px);
                border: 1px solid rgba(255, 215, 90, 0.22);
                box-shadow: 0 22px 56px rgba(0,0,0,0.42), inset 0 0 26px rgba(92, 227, 255, 0.04);
                border-radius: 24px;
                overflow: hidden;
            }
            .side-menu::before, .main-panel::before {
                content: "";
                position: absolute;
                top: 0; left: 12%; right: 12%;
                height: 2px;
                background: linear-gradient(90deg, transparent, #ffd75a, transparent);
                filter: drop-shadow(0 0 12px rgba(255, 215, 90, 0.6));
            }
            .side-menu { display: flex; flex-direction: column; gap: 18px; padding: 24px; }
            .side-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.24em;
                text-transform: uppercase;
                color: #5ce3ff;
                text-shadow: 0 0 14px rgba(92, 227, 255, 0.5);
            }
            .side-tabs { display: flex; flex-direction: column; gap: 12px; }
            .side-tab {
                appearance: none;
                display: flex;
                align-items: center;
                gap: 14px;
                font-family: Poppins, Arial, sans-serif;
                font-size: 15px;
                font-weight: 600;
                color: rgba(255,255,255,0.65);
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: 16px;
                padding: 14px 16px;
                cursor: pointer;
                text-align: left;
                transition: transform 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
            }
            .side-tab .tab-icon {
                width: 40px; height: 40px;
                flex: 0 0 40px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                font-size: 17px;
                background: rgba(92, 227, 255, 0.12);
                border: 1px solid rgba(92, 227, 255, 0.20);
                box-shadow: 0 0 14px rgba(92, 227, 255, 0.12);
                transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
            }
            .side-tab:hover { transform: translateX(4px); color: #fff; border-color: rgba(255,255,255,0.22); }
            .side-tab.active {
                color: #ffd75a;
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.14), rgba(255, 215, 90, 0.04));
                border-color: rgba(255, 215, 90, 0.45);
                box-shadow: 0 0 22px rgba(255, 215, 90, 0.16);
            }
            .side-tab.active .tab-icon {
                background: rgba(255, 215, 90, 0.16);
                border-color: rgba(255, 215, 90, 0.4);
                box-shadow: 0 0 18px rgba(255, 215, 90, 0.3);
            }
            .side-foot {
                margin-top: auto;
                padding-top: 16px;
                border-top: 1px solid rgba(255,255,255,0.08);
                font-size: 11px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: rgba(255,255,255,0.35);
                text-align: center;
            }

            .main-panel { padding: 28px; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; }
            .panel-kicker {
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.24em;
                text-transform: uppercase;
                color: #ffd75a;
                opacity: 0.85;
            }
            .panel-title {
                margin: 6px 0 2px;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 27px;
                color: #fff;
                letter-spacing: 0.02em;
            }
            .panel-sub { margin: 0 0 20px; font-size: 13px; color: rgba(255,255,255,0.6); }
            .panel-glow {
                height: 1px;
                margin-bottom: 24px;
                background: linear-gradient(90deg, #5ce3ff, transparent);
                box-shadow: 0 0 10px rgba(92, 227, 255, 0.4);
            }
            .pane { display: flex; flex-direction: column; gap: 20px; }
            .pane[hidden] { display: none; }

            .setting-card {
                display: flex;
                align-items: center;
                gap: 18px;
                padding: 20px 22px;
                border-radius: 18px;
                background: rgba(255,255,255,0.045);
                border: 1px solid rgba(255,255,255,0.10);
                box-shadow: inset 0 0 18px rgba(255,255,255,0.03);
                transition: border-color 160ms ease, box-shadow 160ms ease;
            }
            .setting-card:hover { border-color: rgba(92, 227, 255, 0.35); box-shadow: inset 0 0 18px rgba(92, 227, 255, 0.04), 0 0 20px rgba(92, 227, 255, 0.08); }
            .setting-icon {
                flex: 0 0 54px;
                width: 54px; height: 54px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                border-radius: 16px;
                background: conic-gradient(from 0deg, rgba(92, 227, 255, 0.4), rgba(6,8,22,0.9) 55%, rgba(92, 227, 255, 0.25));
                padding: 3px;
                box-shadow: 0 0 20px rgba(92, 227, 255, 0.22);
            }
            .setting-icon span {
                width: 100%; height: 100%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                background: rgba(4, 6, 18, 0.85);
            }
            .setting-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
            .setting-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
            }
            .setting-name { font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.9); }
            .setting-value {
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 20px;
                font-weight: 800;
                color: #ffd75a;
                text-shadow: 0 0 14px rgba(255, 215, 90, 0.35);
            }
            .slider-wrap { position: relative; }
            .slider-wrap input[type=range] {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 8px;
                border-radius: 999px;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.08);
                box-shadow: inset 0 0 12px rgba(0,0,0,0.4);
                outline: none;
                cursor: pointer;
            }
            .slider-wrap input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 22px; height: 22px;
                border-radius: 50%;
                background: radial-gradient(circle at 35% 30%, #ffffff, #ffd75a 45%, #c98f1e);
                border: 2px solid rgba(255,255,255,0.85);
                box-shadow: 0 0 16px rgba(255, 215, 90, 0.7), 0 2px 6px rgba(0,0,0,0.5);
                cursor: pointer;
            }
            .slider-wrap input[type=range]::-moz-range-thumb {
                width: 20px; height: 20px;
                border-radius: 50%;
                background: radial-gradient(circle at 35% 30%, #ffffff, #ffd75a 45%, #c98f1e);
                border: 2px solid rgba(255,255,255,0.85);
                box-shadow: 0 0 16px rgba(255, 215, 90, 0.7);
                cursor: pointer;
            }

            /* ---------- CUENTA ---------- */
            .account-card {
                display: flex;
                flex-direction: column;
                gap: 18px;
                padding: 24px;
                border-radius: 20px;
                background:
                    radial-gradient(600px 260px at 100% 0%, rgba(92, 227, 255, 0.10), transparent 55%),
                    rgba(255,255,255,0.045);
                border: 1px solid rgba(255,255,255,0.10);
                box-shadow: inset 0 0 18px rgba(255,255,255,0.03);
            }
            .account-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 14px;
                flex-wrap: wrap;
            }
            .account-row .label { font-size: 13.5px; color: rgba(255,255,255,0.72); }
            .account-status {
                display: inline-flex;
                align-items: center;
                gap: 9px;
                font-size: 14.5px;
                font-weight: 700;
                color: #fff;
            }
            .status-dot {
                width: 10px; height: 10px;
                border-radius: 50%;
                background: #ff6b5e;
                box-shadow: 0 0 12px rgba(255, 107, 94, 0.8);
            }
            .account-status.is-linked .status-dot { background: #34d97b; box-shadow: 0 0 12px rgba(52, 217, 123, 0.8); }
            .account-divider { height: 1px; background: rgba(255,255,255,0.08); }
            .account-actions { display: flex; justify-content: flex-end; gap: 12px; align-items: center; }
            .link-feedback { font-size: 12.5px; color: #34d97b; opacity: 0; transition: opacity 200ms ease; }
            .link-feedback.show { opacity: 1; }
            .btn-link {
                appearance: none;
                display: inline-flex;
                align-items: center;
                gap: 9px;
                font-family: Poppins, Arial, sans-serif;
                font-size: 14px;
                font-weight: 600;
                color: #ffd75a;
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.18), rgba(255, 215, 90, 0.05));
                border: 1px solid rgba(255, 215, 90, 0.45);
                padding: 13px 20px;
                border-radius: 13px;
                cursor: pointer;
                box-shadow: 0 0 18px rgba(255, 215, 90, 0.12);
                transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
            }
            .btn-link:hover { transform: translateY(-2px); box-shadow: 0 0 26px rgba(255, 215, 90, 0.22); background: linear-gradient(135deg, rgba(255, 215, 90, 0.26), rgba(255, 215, 90, 0.08)); }
            .btn-link.is-linked { color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); box-shadow: none; cursor: default; }

            /* ---------- NAV INFERIOR ---------- */
            .bottom-nav {
                position: relative;
                z-index: 4;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 18px;
                padding: 10px 30px;
                background: rgba(6, 8, 22, 0.72);
                backdrop-filter: blur(14px);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 -12px 40px rgba(0,0,0,0.35);
            }
            .nav-elements { display: flex; align-items: center; gap: 12px; }
            .nav-orb {
                width: 40px; height: 40px;
                border-radius: 50%;
                padding: 2px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: conic-gradient(from 0deg, var(--el), transparent 60%);
                opacity: 0.85;
                transition: transform 160ms ease, opacity 160ms ease;
            }
            .nav-orb img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.18); }
            .nav-orb:hover { transform: translateY(-3px) scale(1.08); opacity: 1; }
            .nav-items { display: flex; align-items: center; gap: 10px; }
            .nav-item {
                appearance: none;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.72);
                background: transparent;
                border: 1px solid transparent;
                padding: 10px 18px;
                border-radius: 12px;
                cursor: pointer;
                transition: color 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
            }
            .nav-item:hover { color: #fff; background: rgba(255,255,255,0.06); }
            .nav-item.active {
                color: #ffd75a;
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.14), rgba(255, 215, 90, 0.04));
                border-color: rgba(255, 215, 90, 0.4);
                box-shadow: 0 0 20px rgba(255, 215, 90, 0.16);
            }

            /* ---------- ANIMACIONES ---------- */
            @keyframes floatY {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-16px); }
            }
            @keyframes rise {
                0% { transform: translateY(0) scale(1); opacity: 0.2; }
                100% { transform: translateY(-70px) scale(1.35); opacity: 0.5; }
            }
            @keyframes panelReveal {
                from { opacity: 0; transform: translateY(18px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .side-menu, .main-panel { animation: panelReveal 0.55s cubic-bezier(.2,.8,.2,1) both; }

            @media (max-width: 1000px) {
                .settings-body { grid-template-columns: 1fr; padding: 6px 24px 18px; }
                .side-menu { flex-direction: row; align-items: center; }
                .side-tabs { flex-direction: row; }
                .side-tab { flex: 1; }
                .side-foot { display: none; }
            }
        </style>

        <div class="screen">
            <div class="bg-layer">
                <div class="mountains"></div>
                <div class="horizon-glow"></div>
                <div class="island island-1"></div>
                <div class="island island-2"></div>
                ${particles}
            </div>

            <div class="hud"></div>

            <header class="topbar">
                <div class="brand">
                    <img class="logo" src="/assets/images/logotipomenu.jpg" alt="Elemental Battlecards">
                    <div class="brand-block">
                        <span class="brand-kicker">Elemental Battle Cards</span>
                        <h1>Ajustes</h1>
                        <p>Afina el sonido y administra tu cuenta elemental.</p>
                    </div>
                </div>
                <button class="btn-home" id="btn-home">🏠 Inicio</button>
            </header>

            <main class="settings-body">
                <aside class="side-menu">
                    <span class="side-title">✦ Menú</span>
                    <nav class="side-tabs">
                        <button class="side-tab active" data-tab="sonido">
                            <span class="tab-icon">🔊</span>
                            <span>Sonido</span>
                        </button>
                        <button class="side-tab" data-tab="cuenta">
                            <span class="tab-icon">👤</span>
                            <span>Cuenta</span>
                        </button>
                    </nav>
                    <span class="side-foot">Ajustes Elemental</span>
                </aside>

                <section class="main-panel">
                    <span class="panel-kicker">✦ Elemental Configuration</span>
                    <h2 class="panel-title" id="panel-title">Sonido</h2>
                    <p class="panel-sub" id="panel-sub">Controla el volumen del ambiente y de tus hechizos.</p>
                    <div class="panel-glow"></div>

                    <div class="pane" data-pane="sonido">
                        <div class="setting-card">
                            <div class="setting-icon"><span>🎵</span></div>
                            <div class="setting-main">
                                <div class="setting-top">
                                    <span class="setting-name">Música de fondo</span>
                                    <span class="setting-value" id="music-value">${this.settings.musicVolume}%</span>
                                </div>
                                <div class="slider-wrap">
                                    <input id="music-volume" type="range" min="0" max="100" value="${this.settings.musicVolume}">
                                </div>
                            </div>
                        </div>

                        <div class="setting-card">
                            <div class="setting-icon"><span>✨</span></div>
                            <div class="setting-main">
                                <div class="setting-top">
                                    <span class="setting-name">Efectos de hechizo</span>
                                    <span class="setting-value" id="effects-value">${this.settings.effectsVolume}%</span>
                                </div>
                                <div class="slider-wrap">
                                    <input id="effects-volume" type="range" min="0" max="100" value="${this.settings.effectsVolume}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="pane" data-pane="cuenta" hidden>
                        <div class="account-card">
                            <div class="account-row">
                                <span class="label">Estado de la cuenta</span>
                                <span class="account-status ${this.settings.accountLinked ? 'is-linked' : ''}" id="account-status">
                                    <span class="status-dot"></span>
                                    <span id="account-status-text">${accountStatusLabel}</span>
                                </span>
                            </div>
                            <div class="account-divider"></div>
                            <div class="account-row">
                                <span class="label">Vincular un correo protege tu progreso elemental.</span>
                            </div>
                            <div class="account-actions">
                                <span class="link-feedback" id="link-feedback">✓ Correo vinculado con éxito.</span>
                                <button class="btn-link ${this.settings.accountLinked ? 'is-linked' : ''}" id="link-email">
                                    ${this.settings.accountLinked ? 'Correo vinculado' : 'Vincular correo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <nav class="bottom-nav">
                <div class="nav-elements">${elementsNavHtml}</div>
                <div class="nav-items">
                    <button class="nav-item" data-nav="home">🏠 Inicio</button>
                    <button class="nav-item" data-nav="cards">🃏 Cartas</button>
                    <button class="nav-item" data-nav="missions">🎯 Misiones</button>
                    <button class="nav-item active">⚙️ Configuración</button>
                    <button class="nav-item" data-nav="profile">👤 Perfil</button>
                </div>
            </nav>
        </div>`;

        this.domUI = this.add.dom(0, 0).createFromHTML(html);
        this.domUI.setOrigin(0);
        this.domUI.setDepth(9999);

        this.domUI.node.style.position = 'absolute';
        this.domUI.node.style.left = '0';
        this.domUI.node.style.top = '0';
        this.domUI.node.style.display = 'flex';
        this.domUI.node.style.flexDirection = 'column';
        this.domUI.node.style.width = width + 'px';
        this.domUI.node.style.height = height + 'px';

        const node = this.domUI.node;

        const bind = (selector, fn) => {
            const els = node.querySelectorAll(selector);
            els.forEach(el => {
                const handler = ev => { ev.preventDefault(); playSfx('click', this); fn(ev, el); };
                el.addEventListener('click', handler);
                this.listeners.push({ el, handler, type: 'click' });
            });
        };

        bind('#btn-home', () => this.scene.start(this.returnScene, { playerData: this.playerData }));
        bind('[data-nav="home"]', () => this.scene.start('HomeScenes', { playerData: this.playerData }));
        bind('[data-nav="cards"]', () => this.scene.start('CardsScene', { playerData: this.playerData }));
        bind('[data-nav="missions"]', () => this.scene.start('MissionsScene', { playerData: this.playerData }));
        bind('[data-nav="profile"]', () => this.scene.start('ProfileScene', { playerData: this.playerData }));

        // Menú lateral: alternar paneles Sonido / Cuenta
        const tabs = node.querySelectorAll('.side-tab');
        const panes = node.querySelectorAll('.pane[data-pane]');
        const panelTitle = node.querySelector('#panel-title');
        const panelSub = node.querySelector('#panel-sub');

        tabs.forEach(tab => {
            const handler = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const paneName = tab.dataset.tab;
                panes.forEach(pane => {
                    pane.hidden = pane.dataset.pane !== paneName;
                });
                if (paneName === 'cuenta') {
                    panelTitle.textContent = 'Cuenta';
                    panelSub.textContent = 'Consulta el estado de tu cuenta y vincula tu correo.';
                } else {
                    panelTitle.textContent = 'Sonido';
                    panelSub.textContent = 'Controla el volumen del ambiente y de tus hechizos.';
                }
            };
            tab.addEventListener('click', handler);
            this.listeners.push({ el: tab, handler, type: 'click' });
        });

        const musicSlider = node.querySelector('#music-volume');
        const effectsSlider = node.querySelector('#effects-volume');
        const musicValue = node.querySelector('#music-value');
        const effectsValue = node.querySelector('#effects-value');
        const linkEmail = node.querySelector('#link-email');
        const accountStatus = node.querySelector('#account-status');
        const accountStatusText = node.querySelector('#account-status-text');
        const linkFeedback = node.querySelector('#link-feedback');

        if (musicSlider && musicValue) {
            const handler = () => {
                this.settings.musicVolume = Number(musicSlider.value);
                musicValue.textContent = `${this.settings.musicVolume}%`;
                setMusicVolume(this.settings.musicVolume);
            };
            musicSlider.addEventListener('input', handler);
            this.listeners.push({ el: musicSlider, handler, type: 'input' });
        }

        if (effectsSlider && effectsValue) {
            const handler = () => {
                this.settings.effectsVolume = Number(effectsSlider.value);
                effectsValue.textContent = `${this.settings.effectsVolume}%`;
                setEffectsVolume(this.settings.effectsVolume);
            };
            effectsSlider.addEventListener('input', handler);
            this.listeners.push({ el: effectsSlider, handler, type: 'input' });
        }

        if (linkEmail && accountStatus && accountStatusText && linkFeedback) {
            const handler = () => {
                if (this.settings.accountLinked) return;
                this.settings.accountLinked = true;
                accountStatus.classList.add('is-linked');
                accountStatusText.textContent = 'Vinculado';
                linkEmail.classList.add('is-linked');
                linkEmail.textContent = 'Correo vinculado';
                linkFeedback.classList.add('show');
                playSfx('victory', this);
            };
            linkEmail.addEventListener('click', handler);
            this.listeners.push({ el: linkEmail, handler, type: 'click' });
        }

        this.scale.on('resize', this.onResize, this);
        this.events.on('shutdown', this.onShutdown, this);
    }

    onResize(gameSize) {
        if (!gameSize) return;
        const { width, height } = gameSize;
        if (this.domUI && this.domUI.node) {
            this.domUI.node.style.width = width + 'px';
            this.domUI.node.style.height = height + 'px';
        }
    }

    onShutdown() {
        this.listeners.forEach(({ el, handler, type }) => {
            if (el && el.removeEventListener) el.removeEventListener(type, handler);
        });
        this.listeners = [];
        this.scale.off('resize', this.onResize, this);
        if (this.domUI) {
            this.domUI.destroy();
            this.domUI = null;
        }
    }
}