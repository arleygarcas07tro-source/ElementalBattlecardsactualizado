import Phaser from 'phaser';
import { play as playSfx } from '../helpers/audioManager.js';
import { getMissionProgress } from '../helpers/playerProgress.js';

const ELEMENTS = [
    { key: 'agua',       name: 'Agua',       color: '#38bdf8', soft: 'rgba(56,189,248,0.14)',  glow: 'rgba(56,189,248,0.42)',  img: '/assets/images/iconos/agua.jpeg' },
    { key: 'fuego',      name: 'Fuego',      color: '#fb5a2a', soft: 'rgba(251,90,42,0.14)',   glow: 'rgba(251,90,42,0.42)',   img: '/assets/images/iconos/fuego.jpeg' },
    { key: 'aire',       name: 'Aire',       color: '#6fe3ff', soft: 'rgba(111,227,255,0.14)', glow: 'rgba(111,227,255,0.42)', img: '/assets/images/iconos/luz.jpeg' },
    { key: 'tierra',     name: 'Tierra',     color: '#a78bfa', soft: 'rgba(167,139,250,0.14)', glow: 'rgba(167,139,250,0.42)', img: '/assets/images/iconos/espiritu.jpeg' },
    { key: 'naturaleza', name: 'Naturaleza', color: '#34d97b', soft: 'rgba(52,217,123,0.14)',  glow: 'rgba(52,217,123,0.42)',  img: '/assets/images/iconos/planta.jpeg' },
    { key: 'oscuridad',  name: 'Oscuridad',  color: '#c026d3', soft: 'rgba(192,38,211,0.16)',  glow: 'rgba(192,38,211,0.45)',  img: '/assets/images/iconos/sombra.jpeg' }
];

const MISSIONS = [
    {
        id: 'primera-victoria',
        element: 'fuego',
        title: 'Primera victoria',
        desc: 'Enciende el fuego de tu reinado ganando tu primera batalla contra cualquier oponente.',
        progress: 0,
        target: 1,
        reward: '50',
        unit: 'gemas'
    },
    {
        id: 'coleccionista',
        element: 'agua',
        title: 'Coleccionista',
        desc: 'Coloca los 6 tipos elementales en tu campo en una misma partida.',
        progress: 0,
        target: 1,
        reward: '100',
        unit: 'gemas'
    },
    {
        id: 'fusionador',
        element: 'naturaleza',
        title: 'Fusionador',
        desc: 'Realiza 5 fusiones de cartas iguales.',
        progress: 2,
        target: 5,
        reward: '150',
        unit: 'gemas'
    },
    {
        id: 'racha-victorias',
        element: 'oscuridad',
        title: 'Racha de victorias',
        desc: 'Gana 3 partidas consecutivas contra la IA.',
        progress: 1,
        target: 3,
        reward: '200',
        unit: 'gemas'
    },
    {
        id: 'aprendiz-elemental',
        element: 'aire',
        title: 'Aprendiz elemental',
        desc: 'Ataca al menos una vez con cada uno de los 6 tipos elementales.',
        progress: 4,
        target: 6,
        reward: '120',
        unit: 'gemas'
    },
    {
        id: 'estratega',
        element: 'tierra',
        title: 'Estratega',
        desc: 'Gana una partida manteniendo una carta de nivel 3 en tu campo.',
        progress: 0,
        target: 1,
        reward: '250',
        unit: 'gemas'
    }
];

const elementByKey = key => ELEMENTS.find(el => el.key === key);

export default class MissionsScene extends Phaser.Scene {
    constructor() {
        super('MissionsScene');
        this.playerData = null;
        this.listeners = [];
    }

    init(data) {
        this.playerData = data.playerData || data || {};
    }

    create() {
        const { width, height } = this.scale;

        // Progreso real de las misiones, derivado de las partidas jugadas.
        const username = (this.playerData && this.playerData.username) || 'Jugador';
        const missionProgress = getMissionProgress(username);
        const missions = MISSIONS.map(mission => ({
            ...mission,
            progress: missionProgress[mission.id] || 0
        }));

        // Energía flotante del fondo: motas luminosas posicionadas en JS.
        const particles = Array.from({ length: 10 }, (_, i) => {
            const left = Math.round(4 + ((i * 37) % 92));
            const top = Math.round(8 + ((i * 53) % 70));
            const size = 3 + (i % 3) * 2;
            const delay = (i % 6) * -1.4;
            return `<span class="energy" style="left:${left}%; top:${top}%; width:${size}px; height:${size}px; animation-delay:${delay}s;"></span>`;
        }).join('');

        const missionsHtml = missions.map((mission, index) => {
            const el = elementByKey(mission.element);
            const percent = Math.min(100, Math.round((mission.progress / mission.target) * 100));
            const completed = mission.progress >= mission.target;

            return `
                <article class="mission-card ${completed ? 'is-done' : ''}" data-mission="${mission.id}" style="--el:${el.color}; --el-soft:${el.soft}; --el-glow:${el.glow}; animation-delay:${index * 0.07}s;">
                    <span class="card-accent"></span>
                    <div class="card-top">
                        <div class="mission-orb">
                            <img src="${el.img}" alt="${el.name}" title="${el.name}">
                        </div>
                        <div class="titles">
                            <span class="element-tag">✦ ${el.name}</span>
                            <h3 class="mission-title">${mission.title}</h3>
                            <span class="mission-state">${completed ? 'Completada' : 'En progreso'}</span>
                        </div>
                    </div>
                    <p class="mission-desc">${mission.desc}</p>
                    <div class="mission-bar">
                        <div class="mission-fill" style="width:${percent}%"></div>
                    </div>
                    <div class="mission-meta">
                        <span class="mission-counter">${Math.min(mission.progress, mission.target)} / ${mission.target}</span>
                        <span class="mission-reward">💎 +${mission.reward} ${mission.unit}</span>
                    </div>
                    <button class="btn-details" data-id="${mission.id}">Ver detalles</button>
                </article>
            `;
        }).join('');

        const elementsNavHtml = ELEMENTS.map(el => `
            <span class="nav-orb" style="--el:${el.color}; --el-soft:${el.soft};" title="${el.name}">
                <img src="${el.img}" alt="${el.name}">
            </span>
        `).join('');

        const html = `
        <style>
            :host { box-sizing: border-box; }

            .screen {
                position: absolute;
                inset: 0;
                overflow: hidden;
                color: white;
                font-family: Poppins, 'Segoe UI', Arial, sans-serif;
                background:
                    radial-gradient(1200px 640px at 18% -6%, rgba(138, 0, 255, 0.20), transparent 58%),
                    radial-gradient(1000px 560px at 88% 8%, rgba(43, 143, 239, 0.16), transparent 55%),
                    radial-gradient(1400px 900px at 50% 118%, rgba(255, 176, 64, 0.10), transparent 60%),
                    linear-gradient(180deg, rgba(6, 8, 26, 0.72) 0%, rgba(13, 12, 40, 0.66) 46%, rgba(8, 16, 38, 0.78) 100%),
                    url('/assets/images/MISIONES/Misiones.jpeg') center / cover no-repeat;
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

            /* ---------- TOPBAR ---------- */
            .topbar {
                position: relative;
                z-index: 3;
                display: flex;
                align-items: center;
                gap: 26px;
                padding: 18px 30px 14px;
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
            .brand-block p {
                margin: 4px 0 0;
                font-size: 13.5px;
                color: rgba(255,255,255,0.68);
                max-width: 560px;
            }
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

            /* ---------- GRILLA DE MISIONES ---------- */
            .missions {
                position: relative;
                z-index: 3;
                flex: 1;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 22px;
                padding: 6px 30px 18px;
                overflow-y: auto;
                min-height: 0;
            }
            .mission-card {
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 20px 18px 16px;
                border-radius: 22px;
                background:
                    linear-gradient(160deg, rgba(255,255,255,0.05), rgba(10, 12, 36, 0.72) 55%);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.10);
                box-shadow: 0 18px 44px rgba(0,0,0,0.35);
                overflow: hidden;
                animation: cardReveal 0.6s cubic-bezier(.2,.8,.2,1) both;
                border-top: 1px solid var(--el-soft);
                transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
            }
            .mission-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 26px 56px rgba(0,0,0,0.45), 0 0 34px var(--el-glow);
                border-color: var(--el-soft);
            }
            .card-accent {
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 3px;
                background: linear-gradient(90deg, transparent, var(--el), transparent);
                box-shadow: 0 0 18px var(--el-glow);
                opacity: 0.9;
            }
            .card-top { display: flex; align-items: center; gap: 14px; }
            .mission-orb {
                flex: 0 0 72px;
                width: 72px; height: 72px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: conic-gradient(from 0deg, var(--el), #0b0a26 45%, var(--el) 75%, transparent 100%);
                padding: 3px;
                box-shadow: 0 0 22px var(--el-glow);
                animation: orbPulse 4.5s ease-in-out infinite;
            }
            .mission-orb img {
                width: 100%; height: 100%;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid rgba(0,0,0,0.55);
            }
            .titles { min-width: 0; }
            .element-tag {
                display: inline-block;
                font-size: 10.5px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.14em;
                color: var(--el);
                text-shadow: 0 0 12px var(--el-glow);
            }
            .mission-title {
                margin: 3px 0 2px;
                font-size: 19px;
                font-weight: 700;
                color: #fff;
                letter-spacing: 0.01em;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .mission-state {
                font-size: 10.5px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: rgba(255,255,255,0.45);
            }
            .is-done .mission-state { color: #ffd75a; }
            .mission-desc {
                margin: 0;
                font-size: 12.5px;
                line-height: 1.5;
                color: rgba(255,255,255,0.72);
                min-height: 38px;
            }
            .mission-bar {
                width: 100%;
                height: 9px;
                border-radius: 999px;
                background: rgba(255,255,255,0.08);
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.05);
            }
            .mission-fill {
                height: 100%;
                border-radius: 999px;
                background: linear-gradient(90deg, var(--el), #ffffff57);
                box-shadow: 0 0 14px var(--el-glow);
                transition: width 800ms ease;
            }
            .is-done .mission-fill { background: linear-gradient(90deg, #ffd75a, #fff0b8); }
            .mission-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                font-size: 12.5px;
            }
            .mission-counter { color: rgba(255,255,255,0.6); }
            .mission-reward {
                color: #ffd75a;
                font-weight: 700;
                background: rgba(255, 215, 90, 0.10);
                border: 1px solid rgba(255, 215, 90, 0.28);
                padding: 6px 12px;
                border-radius: 999px;
                box-shadow: 0 0 14px rgba(255, 215, 90, 0.12);
                white-space: nowrap;
            }
            .btn-details {
                appearance: none;
                margin-top: auto;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13.5px;
                font-weight: 600;
                letter-spacing: 0.03em;
                color: var(--el);
                background: var(--el-soft);
                border: 1px solid var(--el);
                border-radius: 12px;
                padding: 10px 14px;
                cursor: pointer;
                transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
            }
            .btn-details:hover {
                transform: translateY(-2px);
                box-shadow: 0 0 20px var(--el-glow);
                background: var(--el-soft);
                filter: brightness(1.15);
            }

            /* ---------- BARRA DE NAVEGACIÓN INFERIOR ---------- */
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
            .nav-orb img {
                width: 100%; height: 100%;
                border-radius: 50%;
                object-fit: cover;
                border: 1px solid rgba(255,255,255,0.18);
            }
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

            /* ---------- MODAL ---------- */
            .modal-overlay {
                position: absolute;
                inset: 0;
                z-index: 20;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(3, 5, 16, 0.72);
                backdrop-filter: blur(6px);
                padding: 24px;
            }
            .modal-overlay[hidden] { display: none; }
            .modal-card {
                width: min(480px, 92%);
                border-radius: 24px;
                padding: 28px;
                text-align: center;
                background:
                    radial-gradient(600px 300px at 50% 0%, var(--el-soft), transparent 60%),
                    linear-gradient(165deg, rgba(24, 18, 50, 0.95), rgba(6, 8, 22, 0.98));
                border: 1px solid var(--el-soft);
                box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 44px var(--el-glow);
                animation: modalPop 0.28s cubic-bezier(.2,.9,.3,1.2) both;
            }
            .modal-orb {
                width: 92px; height: 92px;
                margin: 0 auto 14px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: conic-gradient(from 0deg, var(--el), #0b0a26 45%, var(--el) 80%, transparent 100%);
                padding: 4px;
                box-shadow: 0 0 34px var(--el-glow);
            }
            .modal-orb img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid rgba(0,0,0,0.55); }
            .modal-element {
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.22em;
                text-transform: uppercase;
                color: var(--el);
            }
            .modal-title {
                margin: 8px 0 14px;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 27px;
                color: #fff;
                letter-spacing: 0.02em;
            }
            .modal-desc { margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.75); }
            .modal-bar {
                width: 100%; height: 10px;
                background: rgba(255,255,255,0.08);
                border-radius: 999px;
                overflow: hidden;
            }
            .modal-fill {
                height: 100%;
                border-radius: 999px;
                background: linear-gradient(90deg, var(--el), #fff);
                box-shadow: 0 0 16px var(--el-glow);
            }
            .modal-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 16px 0 22px;
                font-size: 14px;
            }
            .modal-counter { color: rgba(255,255,255,0.6); }
            .modal-reward { color: #ffd75a; font-weight: 700; }
            .btn-close {
                appearance: none;
                width: 100%;
                font-family: Poppins, Arial, sans-serif;
                font-size: 14px;
                font-weight: 600;
                color: #ffd75a;
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.16), rgba(255, 215, 90, 0.05));
                border: 1px solid rgba(255, 215, 90, 0.45);
                padding: 13px;
                border-radius: 12px;
                cursor: pointer;
                transition: transform 160ms ease, box-shadow 160ms ease;
            }
            .btn-close:hover { transform: translateY(-2px); box-shadow: 0 0 22px rgba(255, 215, 90, 0.2); }

            /* ---------- ANIMACIONES ---------- */
            @keyframes floatY {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-16px); }
            }
            @keyframes rise {
                0% { transform: translateY(0) scale(1); opacity: 0.2; }
                100% { transform: translateY(-70px) scale(1.35); opacity: 0.5; }
            }
            @keyframes orbPulse {
                0%, 100% { filter: drop-shadow(0 0 6px var(--el-glow)); }
                50% { filter: drop-shadow(0 0 16px var(--el-glow)); }
            }
            @keyframes cardReveal {
                from { opacity: 0; transform: translateY(26px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes modalPop {
                from { opacity: 0; transform: scale(0.86) translateY(14px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }

            @media (max-width: 900px) {
                .missions { grid-template-columns: 1fr; }
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

            <header class="topbar">
                <div class="brand">
                    <img class="logo" src="/assets/images/logotipomenu.jpg" alt="Elemental Battlecards">
                    <div class="brand-block">
                        <span class="brand-kicker">Elemental Battle Cards</span>
                        <h1>Misiones</h1>
                        <p>Completa objetivos elementales y gana gemas para reforzar tu colección.</p>
                    </div>
                </div>
                <button class="btn-home" id="btn-home">🏠 Inicio</button>
            </header>

            <main class="missions">
                ${missionsHtml}
            </main>

            <nav class="bottom-nav">
                <div class="nav-elements">${elementsNavHtml}</div>
                <div class="nav-items">
                    <button class="nav-item active">Misiones</button>
                    <button class="nav-item" data-nav="settings">⚙️ Configuración</button>
                    <button class="nav-item" data-nav="profile">👤 Perfil</button>
                </div>
            </nav>

            <div class="modal-overlay" id="mission-modal" hidden>
                <div class="modal-card" id="modal-card">
                    <div class="modal-orb"><img id="modal-orb" src="/assets/images/iconos/fuego.jpeg" alt="Icono"></div>
                    <span class="modal-element" id="modal-element">Fuego</span>
                    <h2 class="modal-title" id="modal-title">Misión</h2>
                    <p class="modal-desc" id="modal-desc"></p>
                    <div class="modal-bar"><div class="modal-fill" id="modal-bar" style="width:0%"></div></div>
                    <div class="modal-meta">
                        <span class="modal-counter" id="modal-counter">0 / 1</span>
                        <span class="modal-reward" id="modal-reward">+50 gemas</span>
                    </div>
                    <button class="btn-close" id="btn-close-modal">Cerrar</button>
                </div>
            </div>
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
                this.listeners.push({ el, handler });
            });
        };

        bind('#btn-home', () => this.scene.start('HomeScenes', { playerData: this.playerData }));
        bind('[data-nav="settings"]', () => this.scene.start('SettingsScene', { playerData: this.playerData }));
        bind('[data-nav="profile"]', () => this.scene.start('ProfileScene', { playerData: this.playerData }));

        const modal = node.querySelector('#mission-modal');
        const modalCard = node.querySelector('#modal-card');
        const detailButtons = node.querySelectorAll('.btn-details');

        const openModal = (missionId) => {
            const mission = missions.find(m => m.id === missionId);
            if (!mission || !modal) return;
            const el = elementByKey(mission.element);
            const percent = Math.min(100, Math.round((mission.progress / mission.target) * 100));
            modalCard.style.setProperty('--el', el.color);
            modalCard.style.setProperty('--el-soft', el.soft);
            modalCard.style.setProperty('--el-glow', el.glow);
            node.querySelector('#modal-orb').src = el.img;
            node.querySelector('#modal-element').textContent = '✦ ' + el.name;
            node.querySelector('#modal-title').textContent = mission.title;
            node.querySelector('#modal-desc').textContent = mission.desc;
            node.querySelector('#modal-bar').style.width = percent + '%';
            node.querySelector('#modal-counter').textContent = `${Math.min(mission.progress, mission.target)} / ${mission.target}`;
            node.querySelector('#modal-reward').textContent = `+${mission.reward} ${mission.unit}`;
            modal.hidden = false;
        };

        const closeModal = () => {
            if (modal) modal.hidden = true;
        };

        detailButtons.forEach(btn => {
            const handler = () => { playSfx('click', this); openModal(btn.getAttribute('data-id')); };
            btn.addEventListener('click', handler);
            this.listeners.push({ el: btn, handler });
        });

        const bindClose = (el, fn) => {
            if (!el) return;
            const handler = ev => { ev.preventDefault(); playSfx('click', this); fn(ev); };
            el.addEventListener('click', handler);
            this.listeners.push({ el, handler });
        };
        bindClose(node.querySelector('#btn-close-modal'), closeModal);
        bindClose(modal, (ev) => {
            if (ev.target === modal) closeModal();
        });

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
        this.listeners.forEach(({ el, handler }) => {
            if (el && el.removeEventListener) el.removeEventListener('click', handler);
        });
        this.listeners = [];
        this.scale.off('resize', this.onResize, this);
        if (this.domUI) {
            this.domUI.destroy();
            this.domUI = null;
        }
    }
}