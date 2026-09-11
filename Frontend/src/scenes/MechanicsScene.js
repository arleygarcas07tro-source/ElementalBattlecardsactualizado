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

// Contenido ORIGINAL de las mecánicas (idéntico al del antiguo modal). Solo estilo visual.
const RULES_HTML = `
    <ol class="rules">
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
    </ol>
`;

export default class MechanicsScene extends Phaser.Scene {
    constructor() {
        super('MechanicsScene');
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

            /* ---------- PANEL PRINCIPAL ---------- */
            .mech-body {
                position: relative;
                z-index: 3;
                flex: 1;
                min-height: 0;
                padding: 6px 30px 18px;
            }
            .mech-panel {
                position: relative;
                width: min(1400px, 100%);
                margin: 0 auto;
                height: 100%;
                background: rgba(6, 8, 22, 0.72);
                backdrop-filter: blur(14px);
                border: 1px solid rgba(255, 215, 90, 0.22);
                box-shadow: 0 22px 56px rgba(0,0,0,0.42), inset 0 0 26px rgba(92, 227, 255, 0.04);
                border-radius: 24px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                padding: 26px;
                animation: panelReveal 0.55s cubic-bezier(.2,.8,.2,1) both;
            }
            .mech-panel::before {
                content: "";
                position: absolute;
                top: 0; left: 8%; right: 8%;
                height: 2px;
                background: linear-gradient(90deg, transparent, #ffd75a, transparent);
                filter: drop-shadow(0 0 12px rgba(255, 215, 90, 0.6));
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
            .panel-sub { margin: 0 0 18px; font-size: 13px; color: rgba(255,255,255,0.6); }
            .panel-glow {
                height: 1px;
                margin-bottom: 18px;
                background: linear-gradient(90deg, #5ce3ff, transparent);
                box-shadow: 0 0 10px rgba(92, 227, 255, 0.4);
            }

            /* ---------- LISTA DE REGLAS (siempre visibles) ---------- */
            .rules-wrap {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding-right: 10px;
                border-radius: 14px;
            }
            .rules-wrap::-webkit-scrollbar { width: 10px; }
            .rules-wrap::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 999px; }
            .rules-wrap::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, #ffd75a, #5ce3ff);
                border-radius: 999px;
                box-shadow: 0 0 8px rgba(255, 215, 90, 0.4);
            }

            .rules {
                counter-reset: rule;
                list-style: none;
                margin: 0;
                padding: 2px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .rules > li {
                counter-increment: rule;
                position: relative;
                padding: 20px 22px 18px 68px;
                border-radius: 16px;
                background: linear-gradient(160deg, rgba(255,255,255,0.055), rgba(10, 12, 36, 0.62) 60%);
                border: 1px solid rgba(255,255,255,0.11);
                box-shadow: inset 0 0 18px rgba(255,255,255,0.02);
                font-size: 14.5px;
                line-height: 1.75;
                color: rgba(255,255,255,0.9);
                transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
            }
            .rules > li:hover {
                border-color: rgba(92, 227, 255, 0.35);
                box-shadow: 0 0 22px rgba(92, 227, 255, 0.10);
                transform: translateY(-1px);
            }
            .rules > li::before {
                content: counter(rule);
                position: absolute;
                left: 18px; top: 18px;
                width: 38px; height: 38px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 18px;
                font-weight: 800;
                color: #ffd75a;
                background: rgba(255, 215, 90, 0.12);
                border: 1px solid rgba(255, 215, 90, 0.35);
                box-shadow: 0 0 14px rgba(255, 215, 90, 0.16);
                text-shadow: 0 0 10px rgba(255, 215, 90, 0.35);
            }
            .rules > li > strong {
                display: block;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 17px;
                letter-spacing: 0.02em;
                color: #ffd75a;
                margin-bottom: 8px;
                text-shadow: 0 0 14px rgba(255, 215, 90, 0.25);
            }
            .rules p { margin: 8px 0; }
            .rules p:first-child { margin-top: 0; }
            .rules p:last-child { margin-bottom: 0; }
            .rules ul {
                list-style: none;
                margin: 8px 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .rules ul:first-child { margin-top: 0; }
            .rules ul:last-child { margin-bottom: 0; }
            .rules h3 {
                margin: 10px 0 2px;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: #5ce3ff;
                text-shadow: 0 0 10px rgba(92, 227, 255, 0.45);
            }
            .rules li ul li { position: relative; padding-left: 18px; }
            .rules li ul li::before {
                content: "▸";
                position: absolute;
                left: 0;
                color: #5ce3ff;
                text-shadow: 0 0 8px rgba(92, 227, 255, 0.6);
            }
            .rules strong { color: #fff; }

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

            @media (max-width: 900px) {
                .rules > li { padding: 18px 16px 16px 60px; }
                .rules > li::before { left: 12px; width: 34px; height: 34px; font-size: 16px; }
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
                        <h1>Mecánicas</h1>
                        <p>Domina las reglas, los triángulos elementales y el arte de la fusión.</p>
                    </div>
                </div>
                <nav class="top-nav">
                    <button class="tn" data-nav="home">🏠 Inicio</button>
                    <button class="tn" data-nav="settings">⚙️ Configuración</button>
                    <button class="tn active">📖 Mecánicas</button>
                </nav>
            </header>

            <main class="mech-body">
                <section class="mech-panel">
                    <span class="panel-kicker">✦ Manual elemental</span>
                    <h2 class="panel-title">Reglas del juego</h2>
                    <p class="panel-sub">Las 16 reglas del mundo elemental, siempre visibles. Desplázate para descubrirlas.</p>
                    <div class="panel-glow"></div>
                    <div class="rules-wrap">${RULES_HTML}</div>
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