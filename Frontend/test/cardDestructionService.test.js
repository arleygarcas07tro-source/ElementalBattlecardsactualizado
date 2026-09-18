import { test } from 'node:test';
import assert from 'node:assert/strict';

import CardDestructionService from '../src/game/CardDestructionService.js';

test('CardDestructionService: nivel 1 deja 1 carta base', () => {
    const entries = CardDestructionService.graveyardEntries({ type: 'fuego', level: 1 });

    assert.equal(entries.length, 1);
    assert.deepEqual(entries[0], { id: 'fuego-1', type: 'fuego', level: 1 });
});

test('CardDestructionService: nivel 2 deja 2 cartas base', () => {
    const entries = CardDestructionService.graveyardEntries({ type: 'agua', level: 2 });

    assert.equal(entries.length, 2);
    assert.ok(entries.every(e => e.id === 'agua-1' && e.type === 'agua' && e.level === 1));
});

test('CardDestructionService: nivel 3 deja 4 cartas base', () => {
    const entries = CardDestructionService.graveyardEntries({ type: 'sombra', level: 3 });

    assert.equal(entries.length, 4);
    assert.ok(entries.every(e => e.id === 'sombra-1' && e.type === 'sombra' && e.level === 1));
});
