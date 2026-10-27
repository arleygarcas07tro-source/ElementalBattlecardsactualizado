import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createBattleLayout, rowPositions } from '../src/helpers/battleLayout.js';

test('el tablero usa cartas compactas y mantiene las seis posiciones centradas', () => {
    const layout = createBattleLayout(1600, 900);
    const positions = rowPositions(6, layout.cardField.width, layout.fieldGap, layout.width);

    assert.deepEqual(layout.cardHand, { width: 117, height: 156 });
    assert.deepEqual(layout.cardOpponentHand, { width: 103, height: 139 });
    assert.deepEqual(layout.cardField, { width: 98, height: 132 });
    assert.equal(positions.length, 6);
    assert.ok(positions[0] - layout.cardField.width / 2 > 0);
    assert.ok(positions[5] + layout.cardField.width / 2 < layout.width);
    assert.equal(positions[0] + positions[5], layout.width);
});

test('la composición omite el espacio reservado para gemas en otros modos', () => {
    const layout = createBattleLayout(1600, 900, { usesGems: false });

    assert.equal(layout.dockSections.gems, null);
    assert.equal(layout.dockSections.essence.y, layout.dock.y);
});

test('el campo de seis cartas cabe en el área de juego en resoluciones horizontales', () => {
    for (const [width, height] of [[568, 320], [844, 390], [1280, 720], [1920, 1080]]) {
        const layout = createBattleLayout(width, height);
        const firstCardLeft = layout.fieldRow[0] - layout.cardField.width / 2;
        const lastCardRight = layout.fieldRow.at(-1) + layout.cardField.width / 2;

        assert.equal(layout.fieldCenterX, width / 2, `${width}x${height}: eje central`);
        assert.ok(firstCardLeft >= layout.arena.left, `${width}x${height}: borde izquierdo`);
        assert.ok(lastCardRight <= layout.arena.right, `${width}x${height}: borde derecho`);
    }
});
