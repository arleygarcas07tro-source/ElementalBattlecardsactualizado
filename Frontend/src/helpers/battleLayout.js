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
    return Math.max(0.8, Math.min(width / BATTLE_DESIGN.width, height / BATTLE_DESIGN.height));
}

/** Posiciones X centradas de una fila de elementos. */
export function rowPositions(count, itemWidth, spacing, width) {
    const total = (count * itemWidth) + ((count - 1) * spacing);
    const start = (width / 2) - (total / 2) + (itemWidth / 2);
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

    const margin = px(20);

    // Tamaños de carta (coherentes con los marcos procedurales de 132x180).
    const cardHand = { width: px(128), height: px(172) };
    const cardOpponentHand = { width: px(114), height: px(153) };
    const cardField = { width: px(108), height: px(146) };
    const handGap = px(14);
    const fieldGap = px(22);

    // Muelle lateral derecho: gemas, esencias, relaciones y estado.
    const dockW = Math.min(px(290), Math.max(px(250), Math.round(width * 0.179)));
    const dockX = width - margin - dockW;
    const dockY = px(110);
    const dock = {
        x: dockX,
        y: dockY,
        w: dockW,
        h: height - dockY - px(14),
        padding: px(10),
        gap: px(8)
    };
    dock.innerX = dock.x + dock.padding;
    dock.innerW = dock.w - dock.padding * 2;

    // Arena: ocupa todo el espacio libre entre el perfil izquierdo y el muelle.
    const arena = {
        left: px(92),
        right: dockX - px(18),
        top: px(90),
        bottom: height - px(70)
    };

    const opponentHandY = px(152);
    const opponentFieldY = px(322);
    const playerFieldY = px(552);
    const playerHandY = px(770);
    const centerY = Math.round((opponentFieldY + playerFieldY) / 2);

    const fieldRow = rowPositions(6, cardField.width, fieldGap, width);

    const opponentProfile = { x: margin, y: px(86), w: px(348), h: px(128) };
    const playerProfile = { x: margin, y: height - px(142), w: px(348), h: px(128) };
    const opponentGemPanel = { x: margin, y: px(222), w: px(320), h: px(54) };

    const phasePanel = {
        x: Math.round(width / 2 - px(250)),
        y: px(8),
        w: px(500),
        h: px(64)
    };
    const turnTimer = { x: Math.round(width / 2 + px(330)), y: px(40), radius: px(34) };
    const pauseButton = { x: px(48), y: px(42), radius: px(26) };
    const startButton = { x: width - margin - px(210), y: px(14), w: px(210), h: px(44) };
    const matchTimerPanel = { x: width - margin - px(210), y: px(64), w: px(210), h: px(38) };

    // Secciones verticales del muelle derecho.
    const dockTop = dock.y;
    const dockBottom = dock.y + dock.h;
    const sectionGap = px(8);
    const usable = dockBottom - dockTop - sectionGap * (usesGems ? 3 : 2);
    const gemH = px(146);
    const essenceH = Math.min(px(232), Math.max(px(206), usable - px(360)));
    const relationsH = px(176);
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
            w: Math.round(cardOpponentHand.width * 4 + handGap * 3 + px(72)),
            h: cardOpponentHand.height + px(22)
        },
        player: {
            x: width / 2,
            y: playerHandY,
            w: Math.round(cardHand.width * 4 + handGap * 3 + px(80)),
            h: cardHand.height + px(24)
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
