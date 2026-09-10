import { play as playSfx } from '../helpers/audioManager.js';

const ELEMENTS = [
    { key: 'agua',       name: 'Agua',       color: '#38bdf8', soft: 'rgba(56,189,248,0.14)',  glow: 'rgba(56,189,248,0.42)',  img: '/assets/images/iconos/agua.jpeg' },
    { key: 'fuego',      name: 'Fuego',      color: '#fb5a2a', soft: 'rgba(251,90,42,0.14)',   glow: 'rgba(251,90,42,0.42)',   img: '/assets/images/iconos/fuego.jpeg' },
    { key: 'luz',        name: 'Aire',       color: '#6fe3ff', soft: 'rgba(111,227,255,0.14)', glow: 'rgba(111,227,255,0.42)', img: '/assets/images/iconos/luz.jpeg' },
    { key: 'espiritu',   name: 'Tierra',     color: '#a78bfa', soft: 'rgba(167,139,250,0.14)', glow: 'rgba(167,139,250,0.42)', img: '/assets/images/iconos/espiritu.jpeg' },
    { key: 'planta',     name: 'Naturaleza', color: '#34d97b', soft: 'rgba(52,217,123,0.14)',  glow: 'rgba(52,217,123,0.42)',  img: '/assets/images/iconos/planta.jpeg' },
    { key: 'sombra',     name: 'Oscuridad',  color: '#c026d3', soft: 'rgba(192,38,211,0.16)',  glow: 'rgba(192,38,211,0.45)',  img: '/assets/images/iconos/sombra.jpeg' }
];

const CARD_NAMES = {
    agua:     ['Espíritu Marino', 'Tifón Abisal', 'Leviatán de Hielo'],
    fuego:    ['Chispa Salvaje', 'Coloso Ígneo', 'Fénix Devorador'],
    luz:      ['Brisa del Alba', 'Tormenta Radiante', 'Dragón Celestial'],
    espiritu: ['Pilar Ancestral', 'Montaña Errante', 'Titán Telúrico'],
    planta:   ['Brote Guardián', 'Selva Viva', 'Ente Raigal'],
    sombra:   ['Velo Sombrío', 'Eclipse Abisal', 'Señor de las Sombras']
};

const LEVEL_LABELS = { 1: 'I', 2: 'II', 3: 'III' };
const SKILLS = [
    { icon: '⚔️', title: 'Ataque' },
    { icon: '🛡️', title: 'Defensa' },
    { icon: '✨', title: 'Especial' }
];

const elementByKey = element => ELEMENTS.find(el => el.key === element);

export default class CardsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CardsScene' });
        this.playerData = {};
        this.elements = ELEMENTS.map(el => el.key);
        this.cards = [];
        this.listeners = [];
        this.state = { filter: 'all', query: '' };
        for (const element of this.elements) {
            for (let level = 1; level <= 3; level++) {
                this.cards.push({ element, level });
            }
        }
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

        const sideOrbs = ELEMENTS.map(el => `
            <span class="side-orb" style="--el:${el.color}; --el-glow:${el.glow};" title="${el.name}">
                <img src="${el.img}" alt="${el.name}">
            </span>
        `).join('');

        const elementsNavHtml = ELEMENTS.map(el => `
            <span class="nav-orb" style="--el:${el.color}; --el-soft:${el.soft};" title="${el.name}">
                <img src="${el.img}" alt="${el.name}">
            </span>
        `).join('');

        const cardsHtml = this.cards.map((card, index) => {
            const el = elementByKey(card.element);
            const names = CARD_NAMES[card.element];
            const name = names[card.level - 1];
            const cost = card.level * 2;
            const skillsHtml = SKILLS.map(s => `<span class="skill" title="${s.title}">${s.icon}</span>`).join('');
            const delay = `${(index % 6) * 0.05}s`;

            return `
                <article class="gal-card" data-type="${card.element}" data-name="${name}" data-element="${el.name}"
                    style="--el:${el.color}; --el-soft:${el.soft}; --el-glow:${el.glow}; animation-delay:${delay};">
                    <div class="gal-frame">
                        <img class="gal-img" src="/assets/images/cartas/carta-${card.element}-${card.level}.jpeg" alt="${name}" loading="lazy">
                        <div class="gal-shade"></div>
                        <span class="gal-badge">${LEVEL_LABELS[card.level]}</span>
                        <span class="gal-cost">◆ ${cost}</span>
                        <div class="gal-info">
                            <span class="gal-element">✦ ${el.name}</span>
                            <h4 class="gal-name">${name}</h4>
                            <div class="gal-skills">${skillsHtml}</div>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        const chipsHtml = `
            <button class="filter-chip chip-all active" data-filter="all" style="--el:#ffd75a; --el-soft:rgba(255,215,90,0.14); --el-glow:rgba(255,215,90,0.4);">Todos</button>
            ${ELEMENTS.map(el => `
                <button class="filter-chip" data-filter="${el.key}" style="--el:${el.color}; --el-soft:${el.soft}; --el-glow:${el.glow};">
                    <span class="chip-orb"><img src="${el.img}" alt=""></span>${el.name}
                </button>
            `).join('')}
        `;

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

            /* ---------- FONDO ---------- */
            .bg-layer { position: absolute; inset: 0; pointer-events: none; }
            .mountains {
                position: absolute;
                left: 0; right: 0; bottom: 64px;
                height: 220px;
                opacity: 0.5;
                background: linear-gradient(180deg, rgba(30, 16, 58, 0) 0%, rgba(24, 14, 58, 0.55) 60%, rgba(60, 24, 96, 0.85) 100%);
                clip-path: polygon(0 58%, 7% 34%, 14% 56%, 24% 18%, 33% 50%, 42% 26%, 51% 54%, 61% 22%, 72% 52%, 82% 30%, 91% 55%, 100% 40%, 100% 100%, 0 100%);
                filter: drop-shadow(0 0 24px rgba(138, 0, 255, 0.25));
            }
            .horizon-glow {
                position: absolute;
                left: 50%; bottom: 60px;
                transform: translateX(-50%);
                width: 78%; height: 110px;
                background: radial-gradient(ellipse at center, rgba(110, 240, 255, 0.20), transparent 70%);
                filter: blur(6px);
            }
            .island {
                position: absolute;
                opacity: 0.40;
                clip-path: polygon(14% 46%, 30% 22%, 52% 30%, 74% 16%, 90% 44%, 82% 76%, 22% 82%);
                background: linear-gradient(180deg, #241457, #0b0a26);
                filter: drop-shadow(0 0 18px rgba(110, 240, 255, 0.22)) drop-shadow(0 14px 22px rgba(0,0,0,0.45));
                animation: floatY 15s ease-in-out infinite;
            }
            .island-1 { width: 230px; height: 90px; top: 64%; left: -40px; animation-delay: -4s; }
            .island-2 { width: 300px; height: 110px; top: 58%; right: -60px; background: linear-gradient(180deg, #3a1158, #0b0a26); animation-delay: -9s; }
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

            /* ---------- SÍMBOLOS LATERALES ---------- */
            .side-elements {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                z-index: 2;
                display: flex;
                flex-direction: column;
                gap: 14px;
                padding: 14px 10px;
                background: rgba(6, 8, 22, 0.4);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 20px;
                backdrop-filter: blur(6px);
                box-shadow: 0 0 30px rgba(0,0,0,0.4);
                pointer-events: none;
            }
            .side-elements.left { left: 12px; }
            .side-elements.right { right: 12px; }
            .side-orb {
                width: 34px; height: 34px;
                border-radius: 50%;
                padding: 2px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: conic-gradient(from 0deg, var(--el), transparent 65%);
                animation: orbPulse 5s ease-in-out infinite;
            }
            .side-orb img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.2); }
            .side-orb:nth-child(2) { animation-delay: -0.8s; }
            .side-orb:nth-child(3) { animation-delay: -1.6s; }
            .side-orb:nth-child(4) { animation-delay: -2.4s; }
            .side-orb:nth-child(5) { animation-delay: -3.2s; }
            .side-orb:nth-child(6) { animation-delay: -4s; }

            /* ---------- HUD CORNER BRACKETS ---------- */
            .hud { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
            .hud::before, .hud::after {
                content: "";
                position: absolute;
                width: 46px; height: 46px;
                border: 2px solid rgba(255, 215, 90, 0.35);
                border-radius: 6px;
                filter: drop-shadow(0 0 8px rgba(255, 215, 90, 0.3));
            }
            .hud::before { top: 14px; left: 14px; border-right: none; border-bottom: none; }
            .hud::after { bottom: 14px; right: 14px; border-left: none; border-top: none; }

            /* ---------- TOPBAR ---------- */
            .topbar {
                position: relative;
                z-index: 3;
                display: flex;
                align-items: center;
                gap: 26px;
                flex-wrap: wrap;
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
            .brand-block p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.68); max-width: 460px; }

            .controls {
                margin-left: auto;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 10px;
                max-width: 620px;
                width: 100%;
            }
            .search-wrap {
                position: relative;
                width: 100%;
                max-width: 420px;
            }
            .search-wrap input {
                width: 100%;
                font-family: Poppins, Arial, sans-serif;
                font-size: 14px;
                color: #fff;
                background: rgba(6, 8, 22, 0.6);
                border: 1px solid rgba(255, 215, 90, 0.28);
                border-radius: 12px;
                padding: 11px 14px 11px 40px;
                outline: none;
                box-shadow: inset 0 0 18px rgba(0,0,0,0.4);
                transition: border-color 160ms ease, box-shadow 160ms ease;
            }
            .search-wrap input::placeholder { color: rgba(255,255,255,0.4); }
            .search-wrap input:focus {
                border-color: rgba(255, 215, 90, 0.6);
                box-shadow: inset 0 0 18px rgba(0,0,0,0.4), 0 0 16px rgba(255, 215, 90, 0.14);
            }
            .search-wrap::before {
                content: "🔍";
                position: absolute;
                left: 13px; top: 50%;
                transform: translateY(-50%);
                font-size: 14px;
                opacity: 0.7;
            }
            .chips { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
            .filter-chip {
                appearance: none;
                display: inline-flex;
                align-items: center;
                gap: 7px;
                font-family: Poppins, Arial, sans-serif;
                font-size: 12.5px;
                font-weight: 600;
                color: rgba(255,255,255,0.68);
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 999px;
                padding: 7px 13px;
                cursor: pointer;
                transition: transform 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
            }
            .filter-chip .chip-orb {
                width: 18px; height: 18px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: conic-gradient(from 0deg, var(--el), transparent 70%);
                padding: 1px;
            }
            .filter-chip .chip-orb img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
            .filter-chip:hover { transform: translateY(-2px); color: #fff; }
            .filter-chip.active {
                color: var(--el);
                border-color: var(--el);
                background: var(--el-soft);
                box-shadow: 0 0 14px var(--el-glow);
            }

            /* ---------- GALERÍA ---------- */
            .gallery {
                position: relative;
                z-index: 3;
                flex: 1;
                min-height: 0;
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 16px;
                padding: 6px 96px 18px;
                overflow-y: auto;
                align-content: start;
            }
            .gal-card {
                height: 250px;
                border-radius: 18px;
                overflow: hidden;
                background: rgba(8, 10, 30, 0.6);
                border: 1px solid rgba(255,255,255,0.10);
                box-shadow: 0 14px 34px rgba(0,0,0,0.4);
                opacity: 1;
                transform: scale(1);
                transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease, opacity 200ms ease;
                animation: cardReveal 0.55s cubic-bezier(.2,.8,.2,1) both;
                cursor: pointer;
            }
            .gal-card.is-hidden { display: none; }
            .gal-card:hover {
                transform: translateY(-6px) scale(1.02);
                border-color: var(--el-soft);
                box-shadow: 0 22px 48px rgba(0,0,0,0.5), 0 0 30px var(--el-glow);
            }
            .gal-frame { position: relative; width: 100%; height: 100%; }
            .gal-img {
                position: absolute;
                inset: 0;
                width: 100%; height: 100%;
                object-fit: cover;
                transition: transform 600ms ease, filter 400ms ease;
                filter: saturate(1.02);
            }
            .gal-card:hover .gal-img { transform: scale(1.06); filter: brightness(1.06) saturate(1.06); }
            .gal-shade {
                position: absolute;
                inset: 0;
                background: linear-gradient(to top, rgba(4,6,18,0.94) 0%, rgba(4,6,18,0.35) 42%, rgba(4,6,18,0.05) 68%);
            }
            .gal-badge {
                position: absolute;
                top: 10px; left: 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 30px;
                height: 30px;
                padding: 0 8px;
                border-radius: 10px;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 16px;
                font-weight: 800;
                color: #fff;
                background: linear-gradient(160deg, var(--el), rgba(4,6,18,0.85));
                border: 1px solid rgba(255,255,255,0.35);
                box-shadow: 0 0 14px var(--el-glow);
                text-shadow: 0 1px 3px rgba(0,0,0,0.7);
            }
            .gal-cost {
                position: absolute;
                top: 10px; right: 10px;
                display: inline-flex;
                align-items: center;
                height: 30px;
                padding: 0 10px;
                border-radius: 10px;
                font-size: 13.5px;
                font-weight: 700;
                color: #ffd75a;
                background: rgba(4, 6, 18, 0.75);
                border: 1px solid rgba(255, 215, 90, 0.4);
                box-shadow: 0 0 12px rgba(255, 215, 90, 0.2);
                text-shadow: 0 1px 3px rgba(0,0,0,0.7);
            }
            .gal-info {
                position: absolute;
                left: 12px; right: 12px; bottom: 10px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .gal-element {
                font-size: 9.5px;
                font-weight: 700;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: var(--el);
                text-shadow: 0 0 12px var(--el-glow);
            }
            .gal-name {
                margin: 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 16px;
                color: #fff;
                letter-spacing: 0.01em;
                text-shadow: 0 2px 6px rgba(0,0,0,0.8);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .gal-skills { display: flex; gap: 6px; margin-top: 2px; }
            .skill {
                width: 22px; height: 22px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                background: rgba(4, 6, 18, 0.7);
                border: 1px solid rgba(255,255,255,0.18);
                border-radius: 7px;
                cursor: help;
                transition: transform 150ms ease, border-color 150ms ease;
            }
            .skill:hover { transform: translateY(-2px); border-color: var(--el); }

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
            @keyframes orbPulse {
                0%, 100% { filter: drop-shadow(0 0 4px var(--el-glow)); }
                50% { filter: drop-shadow(0 0 14px var(--el-glow)); }
            }
            @keyframes cardReveal {
                from { opacity: 0; transform: translateY(24px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            @media (max-width: 1100px) {
                .gallery { grid-template-columns: repeat(3, 1fr); padding: 6px 30px 18px; }
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

            <div class="side-elements left">${sideOrbs}</div>
            <div class="side-elements right">${sideOrbs}</div>

            <header class="topbar">
                <div class="brand">
                    <img class="logo" src="/assets/images/logotipomenu.jpg" alt="Elemental Battlecards">
                    <div class="brand-block">
                        <span class="brand-kicker">Elemental Battle Cards</span>
                        <h1>Cartas</h1>
                        <p>Los 6 tipos elementales con sus 3 niveles de fusión y sus ventajas.</p>
                    </div>
                </div>
                <div class="controls">
                    <div class="search-wrap">
                        <input type="text" id="card-search" placeholder="Buscar carta u elemento...">
                    </div>
                    <div class="chips" id="filter-chips">${chipsHtml}</div>
                </div>
            </header>

            <main class="gallery" id="gallery">
                ${cardsHtml}
            </main>

            <nav class="bottom-nav">
                <div class="nav-elements">${elementsNavHtml}</div>
                <div class="nav-items">
                    <button class="nav-item" data-nav="home">🏠 Inicio</button>
                    <button class="nav-item active">Cartas</button>
                    <button class="nav-item" data-nav="settings">⚙️ Configuración</button>
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
                this.listeners.push({ el, handler });
            });
        };

        bind('[data-nav="home"]', () => this.scene.start('HomeScenes', { playerData: this.playerData }));
        bind('[data-nav="settings"]', () => this.scene.start('SettingsScene', { playerData: this.playerData }));
        bind('[data-nav="profile"]', () => this.scene.start('ProfileScene', { playerData: this.playerData }));

        // Click en una carta: feedback sonoro (sin lógica de negocio aquí).
        const cardEls = node.querySelectorAll('.gal-card');
        cardEls.forEach(card => {
            const handler = () => playSfx('click', this);
            card.addEventListener('click', handler);
            this.listeners.push({ el: card, handler });
        });

        // Buscador y filtros
        const searchInput = node.querySelector('#card-search');
        const filterChips = node.querySelectorAll('.filter-chip');

        const applyFilters = () => {
            const q = this.state.query;
            cardEls.forEach(card => {
                const haystack = `${card.dataset.name} ${card.dataset.element}`.toLowerCase();
                const hitQuery = !q || haystack.includes(q);
                const hitFilter = this.state.filter === 'all' || card.dataset.type === this.state.filter;
                card.classList.toggle('is-hidden', !(hitQuery && hitFilter));
            });
        };

        const onSearch = () => {
            this.state.query = searchInput.value.trim().toLowerCase();
            applyFilters();
        };
        searchInput.addEventListener('input', onSearch);
        this.listeners.push({ el: searchInput, handler: onSearch });

        filterChips.forEach(chip => {
            const handler = () => {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.state.filter = chip.dataset.filter;
                applyFilters();
            };
            chip.addEventListener('click', handler);
            this.listeners.push({ el: chip, handler });
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
            if (el && el.removeEventListener) el.removeEventListener('input', handler);
        });
        this.listeners = [];
        this.scale.off('resize', this.onResize, this);
        if (this.domUI) {
            this.domUI.destroy();
            this.domUI = null;
        }
    }
}