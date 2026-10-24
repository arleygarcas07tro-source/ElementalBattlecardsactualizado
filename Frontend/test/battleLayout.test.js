import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createBattleLayout, rowPositions } from '../src/helpers/battleLayout.js';

test('el tablero usa cartas compactas y mantiene las seis posiciones centradas', () => {
    const layout = createBattleLayout(1600, 900);
    const positions = rowPositions(6, layout.cardField.width, layout.fieldGap, layout.width);

    assert.deepEqual(layout.cardHand, { width: 128, height: 172 });
    assert.deepEqual(layout.cardOpponentHand, { width: 114, height: 153 });
    assert.deepEqual(layout.cardField, { width: 108, height: 146 });
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
