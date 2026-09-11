import Phaser from 'phaser';
import { play as playSfx } from '../helpers/audioManager.js';

const ELEMENTS = [
    { key: 'agua',       name: 'Agua',       color: '#38bdf8', soft: 'rgba(56,189,248,0.14)',  glow: 'rgba(56,189,248,0.42)',  img: '/assets/images/iconos/agua.jpeg' },
    { key: 'fuego',      name: 'Fuego',      color: '#fb5a2a', soft: 'rgba(251,90,42,0.14)',   glow: 'rgba(251,90,42,0.42)',   img: '/assets/images/iconos/fuego.jpeg' },
    { key: 'aire',       name: 'Aire',       color: '#6fe3ff', soft: 'rgba(111,227,255,0.14)', glow: 'rgba(111,227,255,0.42)', img: '/assets/images/iconos/luz.jpeg' },
    { key: 'tierra',     name: 'Tierra',     color: '#a78bfa', soft: 'rgba(167,139,250,0.14)', glow: 'rgba(167,139,250,0.42)', img: '/assets/images/iconos/espiritu.jpeg' },
    { key: 'naturaleza', name: 'Naturaleza', color: '#34d97b', soft: 'rgba(52,217,123,0.14)',  glow: 'rgba(52,217,123,0.42)',  img: '/assets/images/iconos/planta.jpeg' },
    { key: 'oscuridad',  name: 'Oscuridad',  color: '#c026d3', soft: 'rgba(192,38,211,0.16)',  glow: 'rgba(192,38,211,0.45)',  img: '/assets/images/iconos/sombra.jpeg' }
];

const SECTIONS = [
    {
        id: 'juego',
        icon: '🎮',
        title: 'El juego',
        body: `
            <p>Elemental Battlecards es un juego de cartas estratégico digital inspirado en la
            <strong>Teoría de Conjuntos</strong>, donde cada mecánica del sistema corresponde a una operación
            matemática formal.</p>
            <p>El objetivo del jugador es vencer al oponente mediante combate, o completar el conjunto total
            de <strong>esencias</strong> y <strong>elementos activos</strong> en el campo de batalla.</p>
        `
    },
    {
        id: 'principios',
        icon: '🔢',
        title: 'Principios matemáticos',
        body: `
            <ul class="formulas">
                <li>
                    <span class="formula">A ∪ B ∪ C</span>
                    <span class="formula-desc"><strong>Unión:</strong> obtener los 6 tipos elementales en tu campo o la colección completa de las 6 esencias.</span>
                </li>
                <li>
                    <span class="formula">A ∩ A</span>
                    <span class="formula-desc"><strong>Intersección:</strong> la fusión de dos cartas idénticas para crear cartas de nivel superior.</span>
                </li>
                <li>
                    <span class="formula">A − B</span>
                    <span class="formula-desc"><strong>Diferencia:</strong> el sistema de ventajas elementales, donde un elemento supera al que "resta".</span>
                </li>
                <li>
                    <span class="formula">A<sup>c</sup></span>
                    <span class="formula-desc"><strong>Complemento:</strong> cartas de nivel 3 que quedan fuera de la relación elemental y anulan ventajas y desventajas.</span>
                </li>
            </ul>
        `
    },
    {
        id: 'vision',
        icon: '👁️',
        title: 'Visión del juego',
        body: `
            <p>Durante la partida, el jugador administra recursos (<strong>esencias</strong>), controla un campo de
            <strong>seis espacios</strong>, invoca cartas, realiza fusiones, interactúa con el rival mediante
            ataques y construye estrategias basadas en combinaciones elementales y operaciones matemáticas.</p>
        `
    },
    {
        id: 'resultado',
        icon: '🏆',
        title: 'Resultado',
        body: `
            <p>El resultado es un <strong>TCG elegante, educativo y competitivo</strong>, con una identidad visual
            basada en iconografía elemental, colores definidos y un layout claro optimizado para pantallas modernas.</p>
        `
    }
];

export default class AboutScene extends Phaser.Scene {
    constructor() {
        super('AboutScene');
        this.playerData = {};
        this.listeners = [];
    }

    init(data) {
        this.playerData = data.playerData || data || {};
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

        const emblemOrbs = ELEMENTS.map((el, i) => {
            const angle = i * 60 - 90;
            return `
                <span class="emblem-orb" style="--el:${el.color}; --el-glow:${el.glow}; transform: rotate(${angle}deg) translate(96px) rotate(${-angle}deg);" title="${el.name}">
                    <img src="${el.img}" alt="${el.name}">
                </span>
            `;
        }).join('');

        const elementsNavHtml = ELEMENTS.map(el => `
            <span class="nav-orb" style="--el:${el.color}; --el-soft:${el.soft};" title="${el.name}">
                <img src="${el.img}" alt="${el.name}">
            </span>
        `).join('');

        const sectionsHtml = SECTIONS.map((sec, i) => `
            <article class="sec ${i === 0 ? 'open' : ''}" data-sec="${sec.id}">
                <button class="sec-head" data-sec="${sec.id}">
                    <span class="sec-icon">${sec.icon}</span>
                    <span class="sec-title">${sec.title}</span>
                    <span class="sec-chev">▾</span>
                </button>
                <div class="sec-body">${sec.body}</div>
            </article>
        `).join('');

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

            /* ---------- FONDO: montañas, castillo, islas y energía ---------- */
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
            .castle-glow {
                position: absolute;
                left: 50%; bottom: 150px;
                transform: translateX(-50%);
                width: 520px; height: 200px;
                background: radial-gradient(ellipse at center, rgba(110, 240, 255, 0.22), rgba(138, 0, 255, 0.10) 45%, transparent 72%);
                filter: blur(8px);
            }
            .castle {
                position: absolute;
                left: 50%; bottom: 120px;
                transform: translateX(-50%);
                width: 440px; height: 280px;
                opacity: 0.8;
                background: linear-gradient(180deg, #241457 0%, #120b38 55%, #0a0a26 100%);
                clip-path: polygon(
                    0 100%, 0 44%, 6% 44%, 6% 28%, 12% 28%, 12% 44%,
                    20% 44%, 20% 22%, 25% 22%, 25% 40%, 32% 40%, 32% 30%,
                    39% 30%, 39% 14%, 46% 14%, 46% 0%, 54% 0%, 54% 14%,
                    61% 14%, 61% 30%, 68% 30%, 68% 40%, 75% 40%, 75% 22%,
                    80% 22%, 80% 44%, 88% 44%, 88% 28%, 94% 28%, 94% 44%,
                    100% 44%, 100% 100%
                );
                filter: drop-shadow(0 0 28px rgba(138, 0, 255, 0.4));
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
            .island-1 { width: 230px; height: 90px; top: 56%; left: -40px; animation-delay: -4s; }
            .island-2 { width: 300px; height: 110px; top: 50%; right: -60px; background: linear-gradient(180deg, #3a1158, #0b0a26); animation-delay: -9s; }
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

            /* ---------- CORNER BRACKETS ---------- */
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

            .top-nav {
                margin-left: auto;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 6px;
                background: rgba(6, 8, 22, 0.55);
                border: 1px solid rgba(255, 215, 90, 0.22);
                border-radius: 16px;
                box-shadow: 0 0 24px rgba(0,0,0,0.3);
            }
            .tn {
                appearance: none;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.75);
                background: transparent;
                border: 1px solid transparent;
                padding: 10px 16px;
                border-radius: 12px;
                cursor: pointer;
                transition: color 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
            }
            .tn:hover { color: #fff; background: rgba(255,255,255,0.06); }
            .tn.active {
                color: #ffd75a;
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.14), rgba(255, 215, 90, 0.04));
                border-color: rgba(255, 215, 90, 0.4);
                box-shadow: 0 0 20px rgba(255, 215, 90, 0.16);
            }

            /* ---------- CUERPO ---------- */
            .about-body {
                position: relative;
                z-index: 3;
                flex: 1;
                min-height: 0;
                display: grid;
                grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
                gap: 26px;
                padding: 6px 30px 18px;
            }
            .about-side, .about-panel {
                position: relative;
                background: rgba(6, 8, 22, 0.72);
                backdrop-filter: blur(14px);
                border: 1px solid rgba(255, 215, 90, 0.22);
                box-shadow: 0 22px 56px rgba(0,0,0,0.42), inset 0 0 26px rgba(92, 227, 255, 0.04);
                border-radius: 24px;
                overflow: hidden;
                animation: panelReveal 0.55s cubic-bezier(.2,.8,.2,1) both;
            }
            .about-side::before, .about-panel::before {
                content: "";
                position: absolute;
                top: 0; left: 12%; right: 12%;
                height: 2px;
                background: linear-gradient(90deg, transparent, #ffd75a, transparent);
                filter: drop-shadow(0 0 12px rgba(255, 215, 90, 0.6));
            }
            .about-side {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 28px;
                padding: 30px 22px;
            }

            /* ---------- EMBLEMA DE LOS SEIS ELEMENTOS ---------- */
            .emblem {
                position: relative;
                width: 240px; height: 240px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background:
                    radial-gradient(circle at center, rgba(255, 215, 90, 0.10), transparent 62%),
                    conic-gradient(from 0deg, rgba(255,215,90,0.28), rgba(92,227,255,0.10) 30%, rgba(255,215,90,0.28) 60%, rgba(92,227,255,0.10) 100%);
                border: 1px solid rgba(255, 215, 90, 0.4);
                box-shadow: 0 0 34px rgba(255, 215, 90, 0.18), inset 0 0 30px rgba(92, 227, 255, 0.06);
                animation: avatarPulse 4.5s ease-in-out infinite;
            }
            .emblem-core {
                width: 74px; height: 74px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 30px;
                font-weight: 800;
                color: #ffd75a;
                background: rgba(6, 8, 22, 0.92);
                border: 1px solid rgba(255, 215, 90, 0.5);
                box-shadow: 0 0 22px rgba(255, 215, 90, 0.4);
                text-shadow: 0 0 14px rgba(255, 215, 90, 0.6);
            }
            .emblem-orb {
                position: absolute;
                left: 50%; top: 50%;
                width: 42px; height: 42px;
                margin-left: -21px; margin-top: -21px;
                border-radius: 50%;
                padding: 2px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: conic-gradient(from 0deg, var(--el), #0b0a26 55%, var(--el) 85%, transparent 100%);
                box-shadow: 0 0 16px var(--el-glow);
                transition: transform 180ms ease;
            }
            .emblem-orb img {
                width: 100%; height: 100%;
                border-radius: 50%;
                object-fit: cover;
                border: 1px solid rgba(255,255,255,0.25);
            }
            .emblem-orb:hover {
                width: 48px; height: 48px;
                margin-left: -24px; margin-top: -24px;
                z-index: 2;
            }
            .emblem-labels {
                display: flex;
                flex-direction: column;
                gap: 6px;
                text-align: center;
            }
            .emblem-kicker {
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.28em;
                text-transform: uppercase;
                color: #5ce3ff;
                text-shadow: 0 0 12px rgba(92, 227, 255, 0.5);
            }
            .motto {
                margin: 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 17px;
                font-style: italic;
                line-height: 1.6;
                color: rgba(255,255,255,0.85);
                text-align: center;
                border-left: 2px solid #ffd75a;
                border-right: 2px solid #ffd75a;
                padding: 8px 18px;
                text-shadow: 0 0 18px rgba(255, 215, 90, 0.25);
            }

            /* ---------- PANEL INFORMATIVO ---------- */
            .about-panel {
                padding: 26px;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }
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
                margin-bottom: 18px;
                background: linear-gradient(90deg, #5ce3ff, transparent);
                box-shadow: 0 0 10px rgba(92, 227, 255, 0.4);
            }

            .secs { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; min-height: 0; padding-right: 4px; }
            .sec {
                border-radius: 16px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.10);
                box-shadow: inset 0 0 18px rgba(255,255,255,0.03);
                overflow: hidden;
                transition: border-color 160ms ease, box-shadow 160ms ease;
            }
            .sec.open { border-color: rgba(92, 227, 255, 0.30); box-shadow: 0 0 20px rgba(92, 227, 255, 0.08); }
            .sec-head {
                appearance: none;
                width: 100%;
                display: flex;
                align-items: center;
                gap: 14px;
                font-family: Poppins, Arial, sans-serif;
                padding: 16px 18px;
                background: transparent;
                border: none;
                cursor: pointer;
                text-align: left;
                color: #fff;
            }
            .sec-icon {
                width: 42px; height: 42px;
                flex: 0 0 42px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                border-radius: 12px;
                background: rgba(255, 215, 90, 0.12);
                border: 1px solid rgba(255, 215, 90, 0.28);
                box-shadow: 0 0 14px rgba(255, 215, 90, 0.12);
            }
            .sec-title { font-size: 16px; font-weight: 700; letter-spacing: 0.01em; }
            .sec-chev {
                margin-left: auto;
                font-size: 14px;
                color: #ffd75a;
                transition: transform 200ms ease;
            }
            .sec.open .sec-chev { transform: rotate(180deg); }
            .sec-body {
                display: none;
                padding: 0 18px 18px 74px;
                font-size: 13.5px;
                line-height: 1.65;
                color: rgba(255,255,255,0.75);
            }
            .sec.open .sec-body { display: block; animation: bodyReveal 0.3s ease both; }
            .sec-body p { margin: 0 0 10px; }
            .sec-body p:last-child { margin-bottom: 0; }
            .formulas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
            .formulas li { display: flex; align-items: flex-start; gap: 14px; }
            .formula {
                flex: 0 0 58px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 16px;
                font-weight: 800;
                color: #ffd75a;
                background: rgba(255, 215, 90, 0.10);
                border: 1px solid rgba(255, 215, 90, 0.35);
                border-radius: 10px;
                padding: 8px 6px;
                text-shadow: 0 0 12px rgba(255, 215, 90, 0.4);
            }
            .formula-desc { font-size: 12.5px; line-height: 1.55; color: rgba(255,255,255,0.78); }

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
            @keyframes bodyReveal {
                from { opacity: 0; transform: translateY(-6px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes avatarPulse {
                0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 215, 90, 0.2)); }
                50% { filter: drop-shadow(0 0 22px rgba(255, 215, 90, 0.45)); }
            }

            @media (max-width: 1000px) {
                .about-body { grid-template-columns: 1fr; padding: 6px 24px 18px; }
                .about-side { flex-direction: row; gap: 22px; }
                .emblem { width: 190px; height: 190px; }
                .emblem-orb { transform-origin: center; }
            }
        </style>

        <div class="screen">
            <div class="bg-layer">
                <div class="mountains"></div>
                <div class="castle-glow"></div>
                <div class="castle"></div>
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
                        <h1>Acerca de</h1>
                        <p>La esencia matemática detrás de cada batalla elemental.</p>
                    </div>
                </div>
                <nav class="top-nav">
                    <button class="tn" data-nav="home">🏠 Inicio</button>
                    <button class="tn" data-nav="settings">⚙️ Configuración</button>
                    <button class="tn active">ℹ️ Acerca de</button>
                </nav>
            </header>

            <main class="about-body">
                <aside class="about-side">
                    <div class="emblem">
                        ${emblemOrbs}
                        <span class="emblem-core">✦</span>
                    </div>
                    <div class="emblem-labels">
                        <span class="emblem-kicker">Seis elementos</span>
                    </div>
                    <p class="motto">"El equilibrio de seis elementos forja un único destino."</p>
                </aside>

                <section class="about-panel">
                    <span class="panel-kicker">✦ Sobre el proyecto</span>
                    <h2 class="panel-title">Descubre el juego</h2>
                    <p class="panel-sub">Un TCG educativo basado en la Teoría de Conjuntos.</p>
                    <div class="panel-glow"></div>
                    <div class="secs">${sectionsHtml}</div>
                </section>
            </main>

            <nav class="bottom-nav">
                <div class="nav-elements">${elementsNavHtml}</div>
                <div class="nav-items">
                    <button class="nav-item" data-nav="cards">🃏 Cartas</button>
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

        bind('[data-nav="home"]', () => this.scene.start('HomeScenes', { playerData: this.playerData }));
        bind('[data-nav="settings"]', () => this.scene.start('SettingsScene', { playerData: this.playerData }));
        bind('[data-nav="cards"]', () => this.scene.start('CardsScene', { playerData: this.playerData }));

        // Secciones plegables.
        const heads = node.querySelectorAll('.sec-head');
        heads.forEach(head => {
            const handler = () => {
                const sec = head.closest('.sec');
                if (sec) sec.classList.toggle('open');
            };
            head.addEventListener('click', handler);
            this.listeners.push({ el: head, handler, type: 'click' });
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