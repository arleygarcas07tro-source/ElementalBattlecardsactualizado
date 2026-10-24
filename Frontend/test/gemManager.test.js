import { test } from 'node:test';
import assert from 'node:assert/strict';

import GemManager from '../src/game/GemManager.js';

test('GemManager: solo las cartas de nivel 3 dan una gema y cada instancia una sola vez', () => {
    const gems = new GemManager();

    assert.equal(gems.registerFieldCard({ type: 'fuego', level: 1, instanceId: 'fuego-1' }), null);
    assert.equal(gems.registerFieldCard({ type: 'fuego', level: 2, instanceId: 'fuego-2' }), null);
    assert.equal(gems.registerFieldCard({ type: 'fuego', level: 3, instanceId: 'fuego-3' }), 'fuego');
    assert.equal(gems.registerFieldCard({ type: 'fuego', level: 3, instanceId: 'fuego-3' }), null);
    assert.equal(gems.count('fuego'), 1);
});
