import { CARD_TYPES } from './constants.js';
import { TYPE_COLORS, ensureFxTextures } from './cardFx.js';
import { ELEMENT_ORDER } from './gemVisual.js';
import { calculateRowPositions } from './zone.js';

/**
 * Dirección artística del campo de batalla (solo presentación, sin lógica).
 *
 * Centraliza los colores/temas de los seis elementos, genera de forma
 * procedural (sin assets nuevos) las texturas de marcos de slot, los marcos
 * ornamentales de las cartas y la vignette, y compone la arena cinematográfica
 * del tablero. Las escenas reutilizan estas piezas en lugar de dibujar cada
 * adorno por separado.
 *
 * No depende de Phaser como import: usa el global `Phaser` ya cargado por
 * `main.js`, igual que el resto de helpers (cardFx, gemVisual).
 */

/** Color principal, profundo y claro de cada elemento. */
export const ELEMENT_THEME = {
    [CARD_TYPES.FUEGO]:    { color: 0xff6b35, deep: 0x4a1405, light: 0xffd0a0, name: 'Fuego' },
    [CARD_TYPES.AGUA]:     { color: 0x35c6ff, deep: 0x06304d, light: 0xcdeeff, name: 'Agua' },
    [CARD_TYPES.PLANTA]:   { color: 0x2be48a, deep: 0x063d22, light: 0xccffe6, name: 'Planta' },
    [CARD_TYPES.LUZ]:      { color: 0xffd75a, deep: 0x4d3a06, light: 0xfff3cf, name: 'Luz' },
    [CARD_TYPES.SOMBRA]:   { color: 0xb44dff, deep: 0x2e0a52, light: 0xe6ccff, name: 'Sombra' },
    [CARD_TYPES.ESPIRITU]: { color: 0x5ce3ff, deep: 0x063a4a, light: 0xd6f6ff, name: 'Espíritu' }
};

/** Paleta de cada bando: el oponente usa rojo/naranja y el jugador azul. */
export const OWNER_THEME = {
    player:   { glow: 0x4fb3ff, bright: 0x9ad8ff, deep: 0x061a33, rune: 0x8fd4ff, metal: 0x35455f },
    opponent: { glow: 0xff5a3c, bright: 0xffb08f, deep: 0x330d06, rune: 0xffb08f, metal: 0x5f3a35 }
};

/** Paleta canónica dorada (paneles, marco neutral). */
export const GOLD = { glow: 0xcfaf6d, rune: 0xe8cf8f, deep: 0x1a1408, metal: 0x3f3826, light: 0xfff2cf };

/** Dimensiones compartidas de slots y marcos de carta (deben coincidir). */
export const SLOT_W = 132;
export const SLOT_H = 180;
/** Espaciado entre columnas de slot: fila de 6 = 932 px (centrada en 1600). */
export const SLOT_GAP = 28;

/** Glifo vectorial de cada elemento, dibujado sobre un halo tintado. */
export const ELEMENT_GLYPHS = {
    [CARD_TYPES.FUEGO]:    '🔥',
    [CARD_TYPES.AGUA]:     '💧',
    [CARD_TYPES.PLANTA]:   '🌿',
    [CARD_TYPES.LUZ]:      '☀',
    [CARD_TYPES.SOMBRA]:   '🌑',
    [CARD_TYPES.ESPIRITU]: '✦'
};

export const BOARD_TEXTURES = {
    slotPlayer: 'art-slot-player',
    slotOpponent: 'art-slot-opponent',
    slotNeutral: 'art-slot-neutral',
    slotHandPlayer: 'art-slot-hand-player',
    slotHandOpponent: 'art-slot-hand-opponent',
    vignette: 'art-vignette'
};

/** Placas pequeñas compartidas por todas las cartas (blancas, tintables). */
export const CARD_PLATE_TEXTURES = {
    levelPlate: 'art-level-plate',
    sealRing: 'art-seal-ring'
};

/** Numerales romanos para la placa de nivel de cada carta. */
export const LEVEL_ROMANS = { 1: 'I', 2: 'II', 3: 'III' };

/**
 * Clave de textura del marco ornamental de una carta: cambia según el
 * elemento (identidad propia) y el nivel (evolución visual).
 * @param {string} type Elemento ('fuego', 'agua', ...).
 * @param {number} level 1, 2 o 3.
 * @returns {string}
 */
export function cardFrameKey(type, level) {
    const lvl = level >= 3 ? 3 : level === 2 ? 2 : 1;
    return `art-card-${type}-${lvl}`;
}

/** @param {'player'|'opponent'} owner */
export function slotTextureKey(owner) {
    return owner === 'player' ? BOARD_TEXTURES.slotPlayer : BOARD_TEXTURES.slotOpponent;
}

/** Paleta de un elemento, con fallback seguro. */
export function themeFor(type) {
    return ELEMENT_THEME[type] || { color: TYPE_COLORS[type] || 0xffffff, deep: 0x111111, light: 0xffffff };
}

/** Puntos de un rombo (diamante) centrado en (x, y). */
function diamondPoints(x, y, r) {
    return [
        new Phaser.Geom.Point(x, y - r),
        new Phaser.Geom.Point(x + r, y),
        new Phaser.Geom.Point(x, y + r),
        new Phaser.Geom.Point(x - r, y)
    ];
}

/** Aclara/oscurece un color entero (0xRRGGBB). amount>0 aclara, <0 oscurece. */
function shade(color, amount) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const t = amount < 0 ? 0 : 255;
    const p = Math.abs(amount);
    const ch = (c) => Math.round(c + (t - c) * p);
    return (ch(r) << 16) | (ch(g) << 8) | ch(b);
}

/* ------------------------------------------------------------------ *
 * Generación procedural de texturas
 * ------------------------------------------------------------------ */

/**
 * Construye la textura de un marco de slot: bisel metálico con luces y
 * sombras, placa interior de piedra oscura con vetas, anillo grabado tenue
 * (muy sutil para no competir con la carta que se coloque encima), runas de
 * esquina y muescas de energía. Los slots del bando llevan el acento de su
 * color; los neutrales, oro apagado.
 */
function buildSlotTexture(scene, key, palette, { neutral = false } = {}) {
    const W = SLOT_W;
    const H = SLOT_H;
    const r = 15;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    const glowAlpha = neutral ? 0.10 : 0.26;
    const borderAlpha = neutral ? 0.55 : 0.95;
    const borderWidth = neutral ? 2 : 3;
    const runeAlpha = neutral ? 0.40 : 0.9;
    const metal = palette.metal || shade(palette.glow, -0.55);

    const diamond = (x, y, rad) => g.fillPoints(diamondPoints(x, y, rad), true);

    // Halo exterior del bando.
    g.fillStyle(palette.glow, glowAlpha).fillRoundedRect(0, 0, W, H, r + 3);
    // Estructura metálica exterior.
    g.fillStyle(metal, 1).fillRoundedRect(2, 2, W - 4, H - 4, r);
    // Bisel profundo (sombra del marco).
    g.fillStyle(0x05070e, 0.97).fillRoundedRect(7, 7, W - 14, H - 14, r - 3);

    // Placa interior de piedra.
    g.fillStyle(0x0c111d, 0.98).fillRoundedRect(12, 12, W - 24, H - 24, r - 6);
    // Vetas de piedra (diagonales tenues).
    g.lineStyle(1, palette.rune, neutral ? 0.045 : 0.075);
    for (let i = 0; i < 5; i++) {
        const vx = 20 + i * ((W - 40) / 4);
        g.lineBetween(vx, 16, vx - 26, H - 16);
    }
    // Sombra interior superior (profundidad de la placa).
    g.fillStyle(0x000000, 0.30).fillRoundedRect(16, 16, W - 32, 34, 8);

    // Anillo grabado centrado: sutil, tapado en gran medida por la carta.
    g.lineStyle(2, palette.rune, neutral ? 0.07 : 0.13).strokeCircle(W / 2, H / 2, 34);
    g.lineStyle(1, palette.rune, neutral ? 0.05 : 0.09).strokeCircle(W / 2, H / 2, 44);
    // Pequeña runa central apenas visible.
    g.fillStyle(palette.rune, neutral ? 0.05 : 0.10);
    diamond(W / 2, H / 2, 9);

    // Biseles metálicos pulidos.
    g.lineStyle(2, shade(metal, 0.45), 0.9).strokeRoundedRect(3, 3, W - 6, H - 6, r);
    g.lineStyle(1, 0x000000, 0.55).strokeRoundedRect(8, 8, W - 16, H - 16, r - 3);
    // Reflejo especular superior e inferior.
    g.lineStyle(2, 0xffffff, 0.15).beginPath();
    g.moveTo(18, 5.5); g.lineTo(W - 18, 5.5); g.strokePath();
    g.lineStyle(2, 0x000000, 0.30).beginPath();
    g.moveTo(18, H - 5.5); g.lineTo(W - 18, H - 5.5); g.strokePath();

    // Bordes de energía (exterior + interior fino).
    g.lineStyle(borderWidth, palette.glow, borderAlpha).strokeRoundedRect(2, 2, W - 4, H - 4, r);
    g.lineStyle(1, palette.rune, neutral ? 0.25 : 0.45).strokeRoundedRect(12, 12, W - 24, H - 24, r - 6);

    // Runas de esquina (rombo metálico con núcleo oscuro).
    [[13, 13], [W - 13, 13], [13, H - 13], [W - 13, H - 13]].forEach(([x, y]) => {
        g.fillStyle(palette.rune, runeAlpha);
        diamond(x, y, 5);
        g.fillStyle(0x000000, 0.4);
        diamond(x, y, 2);
    });

    // Muescas de energía en el eje central superior/inferior.
    g.fillStyle(palette.glow, runeAlpha);
    diamond(W / 2, 4, 6);
    diamond(W / 2, H - 4, 6);
    // Tachuelas laterales (materialidad del marco).
    g.fillStyle(palette.rune, neutral ? 0.30 : 0.55);
    [H * 0.34, H * 0.66].forEach((y) => {
        g.fillCircle(7.5, y, 2.2);
        g.fillCircle(W - 7.5, y, 2.2);
    });

    g.generateTexture(key, W, H);
    g.destroy();
}

/**
 * Adorno de esquina propio de cada elemento (misma escala, distinta forma):
 *  - fuego: púas de llama (diamantes alargados).
 *  - agua: gotas (tres círculos en arco).
 *  - planta: brote (diamante con hojas laterales).
 *  - luz: ráfaga radiante (cruz de rayos + núcleo).
 *  - sombra: humo (círculos decrecientes hacia el interior).
 *  - espíritu: sello arcano (anillo con satélite).
 * Los demás elementos caen en un rombo faceteado (fallback legible).
 */
function drawElementCornerMotif(g, type, x, y, s, color, alpha) {
    const dirX = x < 0 ? 1 : -1; // dirección hacia el interior de la carta
    const dirY = y < 0 ? 1 : -1;
    g.fillStyle(color, alpha);
    g.lineStyle(1.5, color, Math.min(1, alpha + 0.2));
    switch (type) {
        case CARD_TYPES.FUEGO: {
            // Púa de llama: diamante alargado apuntando hacia fuera.
            const ex = x + dirX * -2;
            const ey = y + dirY * -2;
            g.fillPoints([
                new Phaser.Geom.Point(ex - dirX * s * 0.2, ey - dirY * s * 1.6),
                new Phaser.Geom.Point(ex + s * 0.7, ey + dirY * s * 0.2),
                new Phaser.Geom.Point(ex - dirX * s * 0.2, ey + dirY * s * 0.5),
                new Phaser.Geom.Point(ex - s * 0.7, ey + dirY * s * 0.2)
            ], true);
            g.fillStyle(color, alpha * 0.6);
            g.fillCircle(ex - dirX * s * 0.1, ey - dirY * s * 0.6, s * 0.34);
            break;
        }
        case CARD_TYPES.AGUA: {
            // Tres gotas en arco hacia la esquina.
            g.fillCircle(x, y, s * 0.52);
            g.fillStyle(color, alpha * 0.7);
            g.fillCircle(x + dirX * s * 0.9, y + dirY * s * 0.1, s * 0.36);
            g.fillCircle(x + dirX * s * 0.1, y + dirY * s * 0.9, s * 0.36);
            g.lineStyle(1.5, color, alpha * 0.8);
            g.strokeCircle(x, y, s * 0.52);
            break;
        }
        case CARD_TYPES.PLANTA: {
            // Brote: tallo (diamante) con dos hojas (elipses).
            g.fillPoints(diamondPoints(x, y, s * 0.62), true);
            g.fillStyle(color, alpha * 0.75);
            g.fillEllipse(x + dirX * s * 0.95, y + dirY * s * 0.15, s * 0.9, s * 0.5);
            g.fillEllipse(x + dirX * s * 0.15, y + dirY * s * 0.95, s * 0.5, s * 0.9);
            break;
        }
        case CARD_TYPES.LUZ: {
            // Ráfaga: rayos cruzados + núcleo.
            g.lineStyle(2, color, alpha);
            g.lineBetween(x - s, y, x + s, y);
            g.lineBetween(x, y - s, x, y + s);
            g.lineStyle(1, color, alpha * 0.6);
            g.lineBetween(x - s * 0.6, y - s * 0.6, x + s * 0.6, y + s * 0.6);
            g.lineBetween(x + s * 0.6, y - s * 0.6, x - s * 0.6, y + s * 0.6);
            g.fillStyle(color, alpha);
            g.fillCircle(x, y, s * 0.34);
            break;
        }
        case CARD_TYPES.SOMBRA: {
            // Humo: círculos decrecientes hacia el interior.
            g.fillCircle(x, y, s * 0.56);
            g.fillStyle(color, alpha * 0.65);
            g.fillCircle(x + dirX * s * 0.95, y + dirY * s * 0.25, s * 0.34);
            g.fillCircle(x + dirX * s * 1.55, y + dirY * s * 0.7, s * 0.2);
            break;
        }
        case CARD_TYPES.ESPIRITU: {
            // Sello arcano: anillo abierto con satélite.
            g.strokeCircle(x, y, s * 0.58);
            g.fillStyle(color, alpha);
            g.fillCircle(x + dirX * s * 0.72, y + dirY * s * 0.72, s * 0.26);
            g.fillCircle(x, y, s * 0.18);
            break;
        }
        default:
            g.fillPoints(diamondPoints(x, y, s * 0.7), true);
    }
}

/**
 * Construye el marco ornamental de una carta CON identidad elemental.
 * Paleta derivada del elemento y adorno de esquina propio, con progresión
 * de evolución por nivel:
 *  - Nivel 1: bisel sencillo + adorno elemental pequeño.
 *  - Nivel 2: doble borde interior, adorno elemental grande y tachuelas.
 *  - Nivel 3: triple borde, banda radiante interior, coronación superior y
 *    gemas ornamentales: transmite rareza y poder sin perder legibilidad.
 */
function buildElementCardFrameTexture(scene, key, type, level) {
    const W = SLOT_W;
    const H = SLOT_H;
    const r = 14;
    const theme = themeFor(type);
    const glow = theme.color;
    const rune = theme.light;
    const metal = shade(theme.color, -0.62);
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    const outerLine = level === 1 ? 3 : 4;
    const outerAlpha = level === 3 ? 1 : 0.94;

    // Cuerpo metálico tintado por elemento.
    g.fillStyle(metal, 1).fillRoundedRect(0, 0, W, H, r);
    g.fillStyle(0x05070e, 0.98).fillRoundedRect(5, 5, W - 10, H - 10, r - 4);

    // Bisel exterior luminoso del elemento.
    g.lineStyle(outerLine, glow, outerAlpha).strokeRoundedRect(2, 2, W - 4, H - 4, r);
    g.lineStyle(1, 0xffffff, 0.18).strokeRoundedRect(3.5, 3.5, W - 7, H - 7, r - 1);

    // Bordes interiores según evolución.
    if (level >= 2) {
        g.lineStyle(2, rune, 0.85).strokeRoundedRect(9, 9, W - 18, H - 18, r - 5);
    }
    if (level === 3) {
        g.lineStyle(1, rune, 0.55).strokeRoundedRect(13, 13, W - 26, H - 26, r - 8);
        // Banda radiante interior (aura de rareza del nivel 3).
        g.fillStyle(glow, 0.10).fillRoundedRect(13, 13, W - 26, H - 26, r - 8);
        g.fillStyle(rune, 0.06).fillRoundedRect(17, 17, W - 34, H - 34, r - 10);
    }

    // Highlight especular superior.
    g.lineStyle(2, 0xffffff, 0.20).beginPath();
    g.moveTo(14, 4.5); g.lineTo(W - 14, 4.5); g.strokePath();

    // Adornos de esquina elementales (crecen con el nivel).
    const motif = level === 1 ? 7 : level === 2 ? 9 : 11;
    const motifAlpha = level === 1 ? 0.85 : 1;
    const corners = [[13, 13], [W - 13, 13], [13, H - 13], [W - 13, H - 13]];
    corners.forEach(([cx, cy]) => {
        const inX = cx < W / 2 ? 13 : W - 13;
        const inY = cy < H / 2 ? 13 : H - 13;
        drawElementCornerMotif(g, type, inX, inY, motif, rune, motifAlpha);
    });

    // Nivel 2: tachuelas laterales de evolución.
    if (level >= 2) {
        g.fillStyle(rune, 0.75);
        [H * 0.34, H * 0.66].forEach((y) => {
            g.fillCircle(6.5, y, 2.4);
            g.fillCircle(W - 6.5, y, 2.4);
        });
    }

    // Nivel 3: gemas ornamentales + coronación central.
    if (level === 3) {
        corners.forEach(([cx, cy]) => {
            g.fillStyle(glow, 1);
            g.fillPoints(diamondPoints(cx, cy, 6.5), true);
            g.fillStyle(0xffffff, 0.55);
            g.fillPoints(diamondPoints(cx, cy, 2.8), true);
        });
        // Coronación superior/inferior (rombo central en el borde).
        g.fillStyle(rune, 1);
        g.fillPoints(diamondPoints(W / 2, 4, 5.5), true);
        g.fillPoints(diamondPoints(W / 2, H - 4, 5.5), true);
    }

    g.generateTexture(key, W, H);
    g.destroy();
}

/**
 * Placa pequeña de nivel (blanca, tintable por la carta): bisel metálico y
 * esquinas facetadas. La carta dibuja el numeral romano encima.
 */
function buildLevelPlateTexture(scene) {
    const key = CARD_PLATE_TEXTURES.levelPlate;
    if (scene.textures.exists(key)) return;
    const W = 40;
    const H = 22;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, W, H, 6);
    g.fillStyle(0x999999, 1).fillRoundedRect(2, 2, W - 4, H - 4, 4);
    g.lineStyle(2, 0xffffff, 1).strokeRoundedRect(1, 1, W - 2, H - 2, 5);
    g.lineStyle(1, 0x666666, 0.8).strokeRoundedRect(3.5, 3.5, W - 7, H - 7, 4);
    g.fillStyle(0xffffff, 0.85).fillPoints([
        new Phaser.Geom.Point(2, H / 2), new Phaser.Geom.Point(7, H / 2 - 5),
        new Phaser.Geom.Point(7, H / 2 + 5)
    ], true);
    g.fillPoints([
        new Phaser.Geom.Point(W - 2, H / 2), new Phaser.Geom.Point(W - 7, H / 2 - 5),
        new Phaser.Geom.Point(W - 7, H / 2 + 5)
    ], true);
    g.generateTexture(key, W, H);
    g.destroy();
}

/**
 * Anillo del sello elemental (blanco, tintable): círculo grabado con cuatro
 * puntos cardinales. La carta coloca el glifo del elemento en su centro.
 */
function buildSealRingTexture(scene) {
    const key = CARD_PLATE_TEXTURES.sealRing;
    if (scene.textures.exists(key)) return;
    const S = 28;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, 0xffffff, 1).strokeCircle(S / 2, S / 2, S / 2 - 2);
    g.lineStyle(1, 0xffffff, 0.7).strokeCircle(S / 2, S / 2, S / 2 - 5.5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(S / 2, 1.5, 2.2);
    g.fillCircle(S / 2, S - 1.5, 2.2);
    g.fillCircle(1.5, S / 2, 2.2);
    g.fillCircle(S - 1.5, S / 2, 2.2);
    g.generateTexture(key, S, S);
    g.destroy();
}

function buildVignetteTexture(scene) {
    if (scene.textures.exists(BOARD_TEXTURES.vignette)) return;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.30, size / 2, size / 2, size * 0.62);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(3,4,10,0.45)');
    grad.addColorStop(1, 'rgba(1,2,6,0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    scene.textures.addCanvas(BOARD_TEXTURES.vignette, canvas);
}

/**
 * Genera (una sola vez) todas las texturas procedurales del tablero:
 * slots por bando, marco genérico de respaldo y los 18 marcos elementales
 * (6 elementos x 3 niveles) con su adorno propio.
 * @param {Phaser.Scene} scene
 */
export function ensureBoardTextures(scene) {
    if (!scene.textures.exists(BOARD_TEXTURES.slotPlayer)) {
        buildSlotTexture(scene, BOARD_TEXTURES.slotPlayer, OWNER_THEME.player);
    }
    if (!scene.textures.exists(BOARD_TEXTURES.slotOpponent)) {
        buildSlotTexture(scene, BOARD_TEXTURES.slotOpponent, OWNER_THEME.opponent);
    }
    if (!scene.textures.exists(BOARD_TEXTURES.slotNeutral)) {
        buildSlotTexture(scene, BOARD_TEXTURES.slotNeutral, GOLD, { neutral: true });
    }
    if (!scene.textures.exists(BOARD_TEXTURES.slotHandPlayer)) {
        buildSlotTexture(scene, BOARD_TEXTURES.slotHandPlayer, OWNER_THEME.player, { neutral: true });
    }
    if (!scene.textures.exists(BOARD_TEXTURES.slotHandOpponent)) {
        buildSlotTexture(scene, BOARD_TEXTURES.slotHandOpponent, OWNER_THEME.opponent, { neutral: true });
    }
    // Marcos elementales por nivel (identidad propia de cada fuerza).
    Object.values(CARD_TYPES).forEach((type) => {
        [1, 2, 3].forEach((level) => {
            const key = cardFrameKey(type, level);
            if (!scene.textures.exists(key)) {
                buildElementCardFrameTexture(scene, key, type, level);
            }
        });
    });
    buildLevelPlateTexture(scene);
    buildSealRingTexture(scene);
    buildVignetteTexture(scene);
}

/* ------------------------------------------------------------------ *
 * Piezas de la arena
 * ------------------------------------------------------------------ */

/** Suelo de piedra pulida con vetas, baldosas, escalones y fosa central. */
function addArenaFloor(g, W, H) {
    const left = 150;
    const right = W - 150;
    const top = 196;
    const bottom = H - 196;
    const w = right - left;
    const h = bottom - top;
    const cx = W / 2;
    const cy = H / 2;

    // Losa principal con acabado de piedra.
    g.fillStyle(0x0a0e1a, 0.70).fillRoundedRect(left, top, w, h, 52);
    g.fillStyle(0x121c30, 0.40).fillRoundedRect(left + 14, top + 14, w - 28, h - 28, 44);

    // Vetas de mármol diagonales.
    g.lineStyle(1, 0x5f7fb8, 0.05);
    for (let i = 0; i < 9; i++) {
        const x = left + 60 + i * ((w - 120) / 8);
        g.lineBetween(x, top + 30, x - 90, bottom - 30);
    }

    // Baldosas (grid tenue).
    g.lineStyle(1, 0x8fb0ff, 0.045);
    for (let gx = left + 90; gx < right - 40; gx += 90) g.lineBetween(gx, top + 24, gx, bottom - 24);
    for (let gy = top + 90; gy < bottom - 40; gy += 90) g.lineBetween(left + 24, gy, right - 24, gy);

    // Marco de piedra labrada.
    g.lineStyle(3, 0xcfaf6d, 0.32).strokeRoundedRect(left, top, w, h, 52);
    g.lineStyle(1, 0xe8cf8f, 0.16).strokeRoundedRect(left + 12, top + 12, w - 24, h - 24, 44);

    // Escalón superior e inferior (profundidad).
    g.fillStyle(0x060912, 0.55).fillRoundedRect(left + 40, top + 22, w - 80, 16, 8);
    g.fillStyle(0x060912, 0.55).fillRoundedRect(left + 40, bottom - 38, w - 80, 16, 8);

    // Fosa central: anillo de energía contenido.
    g.fillStyle(0x02040a, 0.80).fillEllipse(cx, cy, w * 0.42, h * 0.28);
    g.fillStyle(0x0b2036, 0.55).fillEllipse(cx, cy, w * 0.34, h * 0.22);
    g.lineStyle(2, 0x35c6ff, 0.12).strokeEllipse(cx, cy, w * 0.42, h * 0.28);
    g.lineStyle(1, 0xffd75a, 0.10).strokeEllipse(cx, cy, w * 0.30, h * 0.19);

    // Líneas de fuga (perspectiva) desde el centro.
    g.lineStyle(1, 0x8fb0ff, 0.05);
    [[left, top], [right, top], [left, bottom], [right, bottom]]
        .forEach(([x, y]) => g.lineBetween(cx, cy, x, y));
}

/** Emblema hexagonal central con anillo giratorio, radios y halo. */
function addCentralEmblem(container, scene, cx, cy) {
    const rotor = scene.add.graphics();
    rotor.lineStyle(2, GOLD.glow, 0.38).strokeCircle(0, 0, 118);
    rotor.lineStyle(1, GOLD.glow, 0.20).strokeCircle(0, 0, 94);
    for (let a = 0; a < 12; a++) {
        const ang = (a * Math.PI) / 6;
        rotor.lineStyle(2, GOLD.rune, a % 3 === 0 ? 0.48 : 0.16)
            .lineBetween(Math.cos(ang) * 96, Math.sin(ang) * 96, Math.cos(ang) * 118, Math.sin(ang) * 118);
    }
    rotor.setPosition(cx, cy).setDepth(0);
    container.add(rotor);

    const core = scene.add.graphics();
    // Hexágono.
    const R = 62;
    const hex = [];
    for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        hex.push([Math.cos(a) * R, Math.sin(a) * R]);
    }
    core.fillStyle(GOLD.glow, 0.10);
    core.beginPath();
    core.moveTo(hex[0][0], hex[0][1]);
    for (let i = 1; i < 6; i++) core.lineTo(hex[i][0], hex[i][1]);
    core.closePath();
    core.fillPath();
    core.lineStyle(3, GOLD.rune, 0.70);
    core.strokePoints(hex.map(([x, y]) => new Phaser.Geom.Point(x, y)), true, true);
    core.lineStyle(2, GOLD.glow, 0.45).strokeCircle(0, 0, 40);
    core.fillStyle(GOLD.rune, 0.95).fillCircle(0, 0, 6);
    core.fillStyle(GOLD.glow, 0.16).fillCircle(0, 0, 24);
    core.setPosition(cx, cy).setDepth(0);

    if (scene.textures.exists('fx-glow')) {
        const halo = scene.add.image(cx, cy, 'fx-glow')
            .setTint(GOLD.rune)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(3.6)
            .setAlpha(0.18)
            .setDepth(-1);
        container.add(halo);
        scene.tweens.add({ targets: halo, alpha: { from: 0.12, to: 0.30 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    container.add(core);
    scene.tweens.add({ targets: rotor, angle: 360, duration: 90000, repeat: -1 });
}

/** Estandarte del bando, junto a su campo, con rótulo de elemento. */
function addOwnerBanner(container, scene, x, y, owner) {
    const theme = OWNER_THEME[owner];
    const isPlayer = owner === 'player';
    const label = isPlayer ? 'TU CAMPO' : 'CAMPO RIVAL';

    const g = scene.add.graphics();
    g.fillStyle(0x05070e, 0.72).fillRoundedRect(x - 118, y - 15, 236, 30, 8);
    g.lineStyle(2, theme.glow, 0.85).strokeRoundedRect(x - 118, y - 15, 236, 30, 8);
    g.lineStyle(1, theme.rune, 0.35).strokeRoundedRect(x - 113, y - 10, 226, 20, 6);
    g.fillStyle(theme.rune, 0.95);
    g.fillPoints(diamondPoints(x - 100, y, 4.5), true);
    g.fillPoints(diamondPoints(x + 100, y, 4.5), true);
    container.add(g);

    const text = scene.add.text(x, y, label, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '14px', fontStyle: 'bold',
        color: isPlayer ? '#bfe1ff' : '#ffc2ad',
        stroke: '#000000', strokeThickness: 4, letterSpacing: 2
    }).setOrigin(0.5).setDepth(0);
    container.add(text);
}

function addBattleBeam(g, y, color) {
    g.fillStyle(color, 0.04).fillRect(0, y - 62, 1600, 124);
    g.fillStyle(color, 0.07).fillRect(0, y - 30, 1600, 60);
    g.lineStyle(2, color, 0.28).lineBetween(0, y, 1600, y);
    g.lineStyle(2, color, 0.12).lineBetween(0, y - 26, 1600, y - 26);
    g.lineStyle(2, color, 0.12).lineBetween(0, y + 26, 1600, y + 26);
}

/** Divisor central entre ambos campos (línea de frente + runas de esquina). */
function addCenterDivider(container, scene, cx, cy, W) {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.32).fillRect(0, cy - 3, W, 6);
    g.lineStyle(2, 0xcfaf6d, 0.30).lineBetween(150, cy, W - 150, cy);
    g.lineStyle(1, 0x8fb0ff, 0.10).lineBetween(150, cy - 8, W - 150, cy - 8);
    g.lineStyle(1, 0x8fb0ff, 0.10).lineBetween(150, cy + 8, W - 150, cy + 8);
    // Rombo central (bajo el emblema).
    g.fillStyle(0xcfaf6d, 0.55).fillPoints(diamondPoints(cx, cy, 7), true);
    container.add(g);
}

function addRowFrame(g, positions, yCenter, palette) {
    const left = Math.min(...positions) - 70;
    const right = Math.max(...positions) + 70;
    const top = yCenter - 86;
    const height = 172;
    g.lineStyle(2, palette.glow, 0.50).strokeRoundedRect(left, top, right - left, height, 24);
    g.lineStyle(1, palette.rune, 0.26).strokeRoundedRect(left + 9, top + 9, right - left - 18, height - 18, 18);
    g.fillStyle(palette.rune, 0.85);
    [[left, top], [right, top], [left, top + height], [right, top + height]]
        .forEach(([x, y]) => g.fillPoints(diamondPoints(x, y, 6), true));
    g.fillStyle(palette.glow, 0.9).fillPoints(diamondPoints((left + right) / 2, top, 7), true);
    g.fillPoints(diamondPoints((left + right) / 2, top + height, 7), true);
}

/**
 * Baliza elemental: obelisco de cristal sobre peana labrada, con halo y
 * vibración, integrado con el lenguaje de la interfaz (no un simple rombo).
 */
function addElementBeacon(container, scene, x, y, type, { flip = false } = {}) {
    const theme = themeFor(type);
    const glyph = ELEMENT_GLYPHS[type] || '✦';
    const h = 34;
    const w = 12;
    const sign = flip ? -1 : 1;

    const g = scene.add.graphics();
    // Halo del suelo.
    g.fillStyle(theme.color, 0.07).fillEllipse(x, y + h + 14, 96, 26);
    // Peana labrada.
    g.fillStyle(0x0a0e18, 0.92).fillEllipse(x, y + h + 10, 62, 20);
    g.fillStyle(0x18202f, 0.92).fillEllipse(x, y + h + 6, 48, 15);
    g.lineStyle(2, GOLD.glow, 0.35).strokeEllipse(x, y + h + 6, 48, 15);

    // Obelisco (rombo alargado con facetas).
    g.fillStyle(theme.deep, 0.95).fillPoints(diamondPoints(x, y, h), true);
    g.fillStyle(theme.color, 0.80);
    g.beginPath();
    g.moveTo(x, y - h);
    g.lineTo(x + w, y);
    g.lineTo(x, y + h);
    g.lineTo(x - w, y);
    g.closePath();
    g.fillPath();
    // Faceta clara.
    g.fillStyle(theme.light, 0.55);
    g.beginPath();
    g.moveTo(x, y - h);
    g.lineTo(x - w, y);
    g.lineTo(x, y);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xffffff, 0.50).strokePoints(diamondPoints(x, y, h), true, true);

    // Conexión con la interfaz: haz de luz que sube hacia la arena.
    g.lineStyle(1, theme.color, 0.10).lineBetween(x, y - h - 6 * sign, x, y - h - 90 * sign);
    container.add(g);

    // Glifo vectorial sobre halo tintado (identidad legible del elemento).
    const halo = scene.add.image(x, y - h - 22 * sign, 'fx-glow')
        .setTint(theme.color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0.5);
    container.add(halo);
    const glyphText = scene.add.text(x, y - h - 22 * sign, glyph, {
        fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '20px',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setTint(theme.light);
    try { glyphText.setTint(theme.light); } catch (e) { /* ignore */ }
    container.add(glyphText);

    if (scene.textures.exists('fx-glow')) {
        const shimmer = scene.add.image(x, y, 'fx-glow')
            .setTint(theme.color).setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setAlpha(0.24);
        container.add(shimmer);
        scene.tweens.add({
            targets: shimmer,
            alpha: { from: 0.16, to: 0.40 },
            scale: { from: 1.0, to: 1.35 },
            duration: 1800 + (x % 400),
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }
}

/** Cordillera + ruinas al fondo (tras la arena, trasluce por los bordes). */
function addRuins(container, scene, W, H) {
    const g = scene.add.graphics();

    // Cordillera profunda (tono azulado, muy tenue).
    g.fillStyle(0x0a1226, 0.85);
    const far = [
        [0, 210], [90, 120], [180, 176], [300, 92], [420, 182], [560, 118],
        [700, 174], [840, 100], [980, 180], [1120, 118], [1260, 178], [1400, 104], [W, 190]
    ];
    g.beginPath();
    g.moveTo(0, 200);
    far.forEach(([x, y]) => g.lineTo(x, y));
    g.lineTo(W, 200);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x3a5a8f, 0.16).beginPath();
    g.moveTo(0, 200); far.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(W, 200); g.strokePath();

    // Ruinas cercanas (arcos y columnas) sobre las crestas.
    g.fillStyle(0x05070f, 0.92);
    const pillars = [[150, 210, 200], [230, 210, 150], [520, 210, 168], [600, 210, 190], [980, 210, 156], [1060, 210, 196], [1380, 210, 170]];
    pillars.forEach(([x, base, top]) => g.fillRect(x - 9, top, 18, base - top));
    // Arco central izquierdo/derecho.
    g.lineStyle(9, 0x05070f, 0.92);
    g.beginPath(); g.arc(190, 214, 40, Math.PI, Math.PI * 1.75); g.strokePath();
    g.beginPath(); g.arc(1020, 214, 46, Math.PI * 1.25, Math.PI * 2); g.strokePath();
    g.fillStyle(0xcfa76d, 0.10);
    pillars.forEach(([x, base, top]) => g.fillRect(x - 1.5, top, 3, 10));
    container.add(g);

    // Cordillera inferior (para el borde del jugador).
    const gb = scene.add.graphics();
    gb.fillStyle(0x0a1226, 0.85);
    const farB = [
        [0, H - 200], [140, H - 108], [300, H - 182], [470, H - 96], [640, H - 178],
        [820, H - 112], [980, H - 184], [1160, H - 100], [1330, H - 180], [1470, H - 116], [W, H - 190]
    ];
    gb.beginPath();
    gb.moveTo(0, H - 210);
    farB.forEach(([x, y]) => gb.lineTo(x, y));
    gb.lineTo(W, H - 210);
    gb.closePath();
    gb.fillPath();
    gb.lineStyle(1, 0x3a5a8f, 0.16).beginPath();
    gb.moveTo(0, H - 210); farB.forEach(([x, y]) => gb.lineTo(x, y)); gb.lineTo(W, H - 210); gb.strokePath();
    container.add(gb);
}

function addAmbientMotes(container, scene, W, H) {
    if (!scene.textures.exists('fx-pixel')) return;
    const tints = [0xffd75a, 0x8fd4ff, 0xb44dff, 0x2be48a];
    for (let i = 0; i < 20; i++) {
        const x = 160 + ((i * 137) % (W - 320));
        const y = 230 + ((i * 89) % (H - 460));
        const mote = scene.add.image(x, y, 'fx-pixel')
            .setBlendMode(Phaser.BlendModes.ADD)
            .setTint(tints[i % tints.length])
            .setScale(Phaser.Math.FloatBetween(0.6, 1.4))
            .setAlpha(Phaser.Math.FloatBetween(0.12, 0.34));
        container.add(mote);
        scene.tweens.add({
            targets: mote,
            y: y - Phaser.Math.Between(40, 90),
            alpha: { from: mote.alpha, to: 0.05 },
            duration: Phaser.Math.Between(3500, 6500),
            delay: Phaser.Math.Between(0, 2500),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}

/**
 * Compone la arena cinematográfica del campo de batalla. Todo el adorno se
 * agrupa en un contenedor que la escena destruye al reiniciar la partida.
 * @param {Phaser.Scene} scene
 * @param {{width?:number, height?:number, depth?:number}} [opts]
 * @returns {Phaser.GameObjects.Container}
 */
export function createArena(scene, opts = {}) {
    ensureFxTextures(scene);
    ensureBoardTextures(scene);

    const W = opts.width ?? scene.scale.width;
    const H = opts.height ?? scene.scale.height;
    const CX = W / 2;
    const CY = H / 2;
    const opponentFieldY = H * 0.45 - 70;
    const playerFieldY = H * 0.55 + 70;

    const container = scene.add.container(0, 0).setDepth(opts.depth ?? -0.4);

    // Atmósfera base: capa oscura que aplaca el vídeo de fondo para que el
    // tablero y las cartas destaquen, con luz cálida superior y fría inferior.
    const atmosphere = scene.add.graphics();
    atmosphere.fillStyle(0x030510, 0.66).fillRect(0, 0, W, H);
    atmosphere.fillStyle(0xff6b35, 0.035).fillRect(0, 0, W, 260);
    atmosphere.fillStyle(0x35c6ff, 0.035).fillRect(0, H - 260, W, 260);
    container.add(atmosphere);

    // Cordillera y ruinas de fondo (tras la losa, se ve por los bordes).
    addRuins(container, scene, W, H);

    const floor = scene.add.graphics();
    addArenaFloor(floor, W, H);
    container.add(floor);

    addCenterDivider(container, scene, CX, CY, W);

    // Franjas de energía en las filas de batalla.
    const beams = scene.add.graphics();
    addBattleBeam(beams, opponentFieldY, OWNER_THEME.opponent.glow);
    addBattleBeam(beams, playerFieldY, OWNER_THEME.player.glow);
    container.add(beams);

    // Emblema central con anillo giratorio y halo pulsante.
    addCentralEmblem(container, scene, CX, CY);

    // Marcos ornamentales sobre las filas reales (mismos cálculos que los slots).
    const frames = scene.add.graphics();
    const positions = calculateRowPositions({ numItems: 6, itemWidth: SLOT_W, itemSpacing: SLOT_GAP, containerWidth: W });
    addRowFrame(frames, positions, opponentFieldY, OWNER_THEME.opponent);
    addRowFrame(frames, positions, playerFieldY, OWNER_THEME.player);
    container.add(frames);

    // Estandartes de bando junto a cada campo.
    addOwnerBanner(container, scene, 260, opponentFieldY - 108, 'opponent');
    addOwnerBanner(container, scene, W - 260, opponentFieldY - 108, 'opponent');
    addOwnerBanner(container, scene, 260, playerFieldY + 108, 'player');
    addOwnerBanner(container, scene, W - 260, playerFieldY + 108, 'player');

    // Balizas elementales: 3 junto al campo rival, 3 junto al del jugador.
    const topTypes = [CARD_TYPES.FUEGO, CARD_TYPES.LUZ, CARD_TYPES.AGUA];
    const bottomTypes = [CARD_TYPES.PLANTA, CARD_TYPES.ESPIRITU, CARD_TYPES.SOMBRA];
    addElementBeacon(container, scene, 96, opponentFieldY - 40, topTypes[0], { flip: true });
    addElementBeacon(container, scene, W - 96, opponentFieldY - 40, topTypes[1], { flip: true });
    addElementBeacon(container, scene, 96, opponentFieldY + 40, topTypes[2], { flip: true });
    addElementBeacon(container, scene, W - 96, playerFieldY + 40, bottomTypes[0]);
    addElementBeacon(container, scene, 96, playerFieldY - 40, bottomTypes[1]);
    addElementBeacon(container, scene, W - 96, playerFieldY - 40, bottomTypes[2]);

    // Motas de energía ambiental.
    addAmbientMotes(container, scene, W, H);

    // Viñeta de cierre: oscurece los bordes por encima del resto de la arena.
    container.add(scene.add.image(CX, CY, BOARD_TEXTURES.vignette).setDisplaySize(W * 1.32, H * 1.32).setAlpha(0.9));

    return container;
}

/** Puntos de una "muesca" en las esquinas de un panel ornamentado. */
function cornerTicks(g, accent, x, y, w, h) {
    const notch = 7;
    g.fillStyle(accent, 0.95);
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
        .forEach(([px, py]) => g.fillPoints(diamondPoints(px, py, 6), true));
    g.lineStyle(1, 0x000000, 0.35);
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
        .forEach(([px, py]) => g.strokePoints(diamondPoints(px, py, notch), true, true));
}

/**
 * Dibuja un panel de interfaz pulido (fantasía oscura con detalles metálicos):
 * sombra proyectada, cuerpo con gradiente, doble borde con bisel y esquinas.
 * Devuelve el Graphics ya posicionado, listo para añadirse a un contenedor.
 * @param {Phaser.Scene} scene
 * @param {{x:number, y:number, w:number, h:number, accent?:number, fill?:number, radius?:number}} cfg
 * @returns {Phaser.GameObjects.Graphics}
 */
export function drawOrnatePanel(scene, cfg) {
    const { x, y, w, h, accent = GOLD.glow, fill = 0x0a0e1c, radius = 16 } = cfg;
    const g = scene.add.graphics();
    // Sombra proyectada.
    g.fillStyle(0x000000, 0.40).fillRoundedRect(x + 2, y + 6, w, h, radius);
    // Cuerpo con gradiente sutil mediante bandas.
    g.fillStyle(shade(fill, -0.35), 0.96).fillRoundedRect(x, y, w, h, radius);
    g.fillStyle(fill, 0.92).fillRoundedRect(x + 3, y + 3, w - 6, h - 8, radius - 2);
    g.fillStyle(0xffffff, 0.05).fillRoundedRect(x + 6, y + 5, w - 12, h * 0.42, radius - 4);
    // Bisel exterior e interior.
    g.lineStyle(2, accent, 0.90).strokeRoundedRect(x, y, w, h, radius);
    g.lineStyle(1, shade(accent, 0.35), 0.35).strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, radius - 4);
    // Highlight especular superior.
    g.lineStyle(1, 0xffffff, 0.14).beginPath();
    g.moveTo(x + radius, y + 1.5); g.lineTo(x + w - radius, y + 1.5); g.strokePath();
    cornerTicks(g, accent, x, y, w, h);
    return g;
}

/**
 * Etiqueta de título con estilo de fantasía (mayúsculas, dorado, sombra).
 * @returns {Phaser.GameObjects.Text}
 */
export function ornateLabel(scene, x, y, text, opts = {}) {
    return scene.add.text(x, y, text, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: opts.fontSize || '14px',
        fontStyle: 'bold',
        color: opts.color || '#e8cf8f',
        stroke: '#000000',
        strokeThickness: opts.strokeThickness || 4,
        letterSpacing: opts.letterSpacing || 1
    }).setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
}

/**
 * Bandeja de la mano: plataforma ornamentada sobre la que se abanican las
 * cartas, para dar profundidad e integrar la mano con la arena.
 * @returns {Phaser.GameObjects.Graphics}
 */
export function drawHandTray(scene, cx, cy, w, h, owner = 'player') {
    const theme = OWNER_THEME[owner] || OWNER_THEME.player;
    const g = scene.add.graphics();
    const x = cx - w / 2;
    const y = cy - h / 2;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(x, y + 6, w, h, 18);
    g.fillStyle(0x070a14, 0.66).fillRoundedRect(x, y, w, h, 18);
    g.fillStyle(theme.deep, 0.35).fillRoundedRect(x + 6, y + 6, w - 12, h - 12, 14);
    g.lineStyle(2, theme.glow, 0.40).strokeRoundedRect(x, y, w, h, 18);
    g.lineStyle(1, GOLD.glow, 0.22).strokeRoundedRect(x + 8, y + 8, w - 16, h - 16, 12);
    g.fillStyle(GOLD.rune, 0.75);
    [[x, y + h / 2], [x + w, y + h / 2]]
        .forEach(([px, py]) => g.fillPoints(diamondPoints(px, py, 5), true));
    return g;
}

export { ELEMENT_ORDER };
