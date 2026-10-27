/**
 * Layout compartido de la pantalla de partida.
 *
 * Responsabilidad agregada: ser la única fuente de verdad de las posiciones y
 * tamaños de la arena, las filas de cartas y los paneles del HUD. Al calcular
 * todo a partir del tamaño real de la escena, GameScene, BoardRenderer,
 * battlefieldArt y UIScene comparten la misma composición y no se pisan entre
 * sí. No contiene lógica de juego: solo geometría de presentación.
 */

export const BATTLE_DESIGN = { width: 1600, height: 900 };

/** Escala tipográfica/geométrica común para el HUD. */
export function battleScale(width, height) {
    const base = Math.min(width / BATTLE_DESIGN.width, height / BATTLE_DESIGN.height);
    const fitted = base * 0.94;
    return Math.max(0.38, Math.min(fitted, 1.0));
}

/** Posiciones X centradas de una fila de elementos. */
export function rowPositions(count, itemWidth, spacing, width, centerX = width / 2) {
    const total = (count * itemWidth) + ((count - 1) * spacing);
    const start = centerX - (total / 2) + (itemWidth / 2);
    return Array.from({ length: count }, (_, i) => start + i * (itemWidth + spacing));
}

/**
 * Calcula toda la composición de la pantalla de partida.
 * @param {number} width Ancho lógico de la escena.
 * @param {number} height Alto lógico de la escena.
 * @param {{usesGems?: boolean}} [options] Configuración de presentación del modo.
 */
export function createBattleLayout(width, height, { usesGems = true } = {}) {
    const s = battleScale(width, height);
    const px = (value) => Math.round(value * s);

    const isShort = height < 880;
    const isVeryShort = height < 780;
    const v = isVeryShort ? 0.9 : isShort ? 0.95 : 1.0;

    const margin = px(16);

    // Cartas adaptativas al tamaño
    const cardHand = { width: px(Math.round(124 * v)), height: px(Math.round(166 * v)) };
    const cardOpponentHand = { width: px(Math.round(110 * v)), height: px(Math.round(148 * v)) };
    const cardField = { width: px(Math.round(104 * v)), height: px(Math.round(140 * v)) };
    const handGap = px(Math.round(12 * v));
    const fieldGap = px(Math.round(18 * v));

    // Muelle lateral derecho adaptativo
    const dockW = Math.min(px(280), Math.max(px(230), Math.round(width * 0.17)));
    const dockX = width - margin - dockW;
    const dockY = px(isVeryShort ? 96 : isShort ? 102 : 108);
    const dock = {
        x: dockX,
        y: dockY,
        w: dockW,
        h: height - dockY - px(10),
        padding: px(10),
        gap: px(8)
    };
    dock.innerX = dock.x + dock.padding;
    dock.innerW = dock.w - dock.padding * 2;

    // Arena optimizada
    const arena = {
        left: px(84),
        right: dockX - px(14),
        top: px(isVeryShort ? 84 : isShort ? 88 : 92),
        bottom: height - px(isVeryShort ? 66 : isShort ? 68 : 72)
    };

    // Filas adaptativas verticalmente
    const opponentHandY = px(isVeryShort ? 142 : isShort ? 150 : 158);
    const opponentFieldY = px(isVeryShort ? 306 : isShort ? 320 : 334);
    const playerFieldY = px(isVeryShort ? 526 : isShort ? 548 : 570);
    const playerHandY = px(isVeryShort ? 736 : isShort ? 760 : 784);
    const centerY = Math.round((opponentFieldY + playerFieldY) / 2);

    const fieldCenterX = width / 2;
    const fieldRow = rowPositions(6, cardField.width, fieldGap, width, fieldCenterX);

    const opponentProfile = { x: margin, y: px(isVeryShort ? 80 : isShort ? 84 : 88), w: px(330), h: px(120) };
    const playerProfile = { x: margin, y: height - px(isVeryShort ? 134 : isShort ? 140 : 146), w: px(330), h: px(120) };
    const opponentGemPanel = { x: margin, y: px(isVeryShort ? 210 : isShort ? 220 : 230), w: px(304), h: px(52) };

    const phasePanel = {
        x: Math.round(width / 2 - px(240)),
        y: px(6),
        w: px(480),
        h: px(62)
    };
    const turnTimer = { x: Math.round(width / 2 + px(320)), y: px(isVeryShort ? 38 : 42), radius: px(32) };
    const pauseButton = { x: px(46), y: px(isVeryShort ? 40 : 44), radius: px(25) };
    const startButton = { x: width - margin - px(200), y: px(12), w: px(200), h: px(42) };
    const matchTimerPanel = { x: width - margin - px(200), y: px(62), w: px(200), h: px(36) };

    // Muelle compacto pero legible
    const dockTop = dock.y;
    const dockBottom = dock.y + dock.h;
    const sectionGap = px(7);
    const usable = dockBottom - dockTop - sectionGap * (usesGems ? 3 : 2);
    const gemH = px(isVeryShort ? 136 : 148);
    const essenceH = Math.min(px(isVeryShort ? 210 : 228), Math.max(px(196), usable - px(340)));
    const relationsH = px(isVeryShort ? 162 : 174);
    const statusH = usable - (usesGems ? gemH : 0) - essenceH - relationsH;

    const gems = usesGems ? { x: dock.innerX, y: dockTop, w: dock.innerW, h: gemH } : null;
    const essence = {
        x: dock.innerX,
        y: dockTop + (usesGems ? gemH + sectionGap : 0),
        w: dock.innerW,
        h: essenceH
    };
    const relations = { x: dock.innerX, y: essence.y + essence.h + sectionGap, w: dock.innerW, h: relationsH };
    const status = { x: dock.innerX, y: relations.y + relations.h + sectionGap, w: dock.innerW, h: statusH };

    const trays = {
        opponent: {
            x: width / 2,
            y: opponentHandY,
            w: Math.round(cardOpponentHand.width * 4 + handGap * 3 + px(60)),
            h: cardOpponentHand.height + px(18)
        },
        player: {
            x: width / 2,
            y: playerHandY,
            w: Math.round(cardHand.width * 4 + handGap * 3 + px(68)),
            h: cardHand.height + px(20)
        }
    };

    return {
        scale: s,
        px,
        width,
        height,
        margin,
        cardHand,
        cardOpponentHand,
        cardField,
        handGap,
        fieldGap,
        fieldCenterX,
        dock,
        arena,
        opponentHandY,
        opponentFieldY,
        playerFieldY,
        playerHandY,
        centerY,
        fieldRow,
        trays,
        opponentProfile,
        playerProfile,
        opponentGemPanel,
        phasePanel,
        turnTimer,
        pauseButton,
        startButton,
        matchTimerPanel,
        dockSections: { gems, essence, relations, status }
    };
}
