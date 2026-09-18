import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveCombat } from '../src/helpers/combat.js';

test('combat: diferencia de 2 niveles es victoria automática del atacante', () => {
    const r = resolveCombat({ type: 'fuego', level: 3 }, { type: 'agua', level: 1 });

    assert.deepEqual(r, { winner: 'attacker', loser: 'defender' });
});

test('combat: diferencia de -2 niveles es victoria automática del defensor', () => {
    const r = resolveCombat({ type: 'fuego', level: 1 }, { type: 'agua', level: 3 });

    assert.deepEqual(r, { winner: 'defender', loser: 'attacker' });
});

test('combat: ventaja de tipo a igual nivel gana', () => {
    const r = resolveCombat({ type: 'fuego', level: 1 }, { type: 'planta', level: 1 });

    assert.deepEqual(r, { winner: 'attacker', loser: 'defender' });
});

test('combat: desventaja de tipo a igual nivel pierde', () => {
    const r = resolveCombat({ type: 'planta', level: 1 }, { type: 'fuego', level: 1 });

    assert.deepEqual(r, { winner: 'defender', loser: 'attacker' });
});

test('combat: tipos neutrales a igual nivel no produce ganador', () => {
    const r = resolveCombat({ type: 'fuego', level: 1 }, { type: 'luz', level: 1 });

    assert.deepEqual(r, { winner: 'none', loser: 'none' });
});

test('combat: con +1 nivel, si el defensor tenía ventaja se vuelve neutral', () => {
    const r = resolveCombat({ type: 'fuego', level: 2 }, { type: 'agua', level: 1 });

    assert.deepEqual(r, { winner: 'none', loser: 'none' });
});

test('combat: con +1 nivel, si el defensor no tiene ventaja el atacante gana', () => {
    const r = resolveCombat({ type: 'fuego', level: 2 }, { type: 'planta', level: 1 });

    assert.deepEqual(r, { winner: 'attacker', loser: 'defender' });
});

test('combat: con -1 nivel, si el atacante tenía ventaja se vuelve neutral', () => {
    const r = resolveCombat({ type: 'agua', level: 1 }, { type: 'fuego', level: 2 });

    assert.deepEqual(r, { winner: 'none', loser: 'none' });
});

test('combat: con -1 nivel, si el atacante no tiene ventaja el defensor gana', () => {
    const r = resolveCombat({ type: 'planta', level: 1 }, { type: 'fuego', level: 2 });

    assert.deepEqual(r, { winner: 'defender', loser: 'attacker' });
});
