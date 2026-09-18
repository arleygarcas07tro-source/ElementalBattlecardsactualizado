import { test } from 'node:test';
import assert from 'node:assert/strict';

import Battlefield from '../src/game/Battlefield.js';

test('Battlefield: arranca vacío con el tamaño indicado', () => {
    const field = new Battlefield(6);

    assert.equal(field.size, 6);
    assert.equal(field.count(), 0);
    assert.equal(field.hasAny(), false);
    assert.deepEqual(field.emptyIndices(), [0, 1, 2, 3, 4, 5]);
});

test('Battlefield: set y get almacenan la carta en el slot', () => {
    const field = new Battlefield(2);
    const card = { instanceId: 'a' };

    field.set(0, card);

    assert.equal(field.get(0), card);
    assert.equal(field.isEmpty(0), false);
    assert.equal(field.isEmpty(1), true);
});

test('Battlefield: get fuera de rango devuelve undefined y set no muta', () => {
    const field = new Battlefield(2);

    field.set(5, { instanceId: 'x' });

    assert.equal(field.get(5), undefined);
    assert.equal(field.count(), 0);
});

test('Battlefield: clearAt vacía un slot', () => {
    const field = new Battlefield(2);
    field.set(1, { instanceId: 'a' });

    field.clearAt(1);

    assert.equal(field.get(1), null);
    assert.equal(field.isEmpty(1), true);
});

test('Battlefield: cards ignora huecos y count los cuenta', () => {
    const field = new Battlefield(3);
    field.set(0, { instanceId: 'a', type: 'fuego' });
    field.set(2, { instanceId: 'b', type: 'agua' });

    assert.equal(field.count(), 2);
    assert.deepEqual(field.cards().map(c => c.instanceId), ['a', 'b']);
});

test('Battlefield: types devuelve los tipos elementales presentes', () => {
    const field = new Battlefield(3);
    field.set(0, { instanceId: 'a', type: 'fuego' });
    field.set(1, { instanceId: 'b', type: 'fuego' });
    field.set(2, { instanceId: 'c', type: 'agua' });

    assert.deepEqual([...field.types()].sort(), ['agua', 'fuego']);
});

test('Battlefield: findIndexByCard localiza por instanceId', () => {
    const field = new Battlefield(3);
    field.set(1, { instanceId: 'abc' });

    assert.equal(field.findIndexByCard('abc'), 1);
    assert.equal(field.findIndexByCard('nope'), -1);
});

test('Battlefield: snapshot es una copia del estado interno', () => {
    const field = new Battlefield(2);
    field.set(0, { instanceId: 'a' });

    const snap = field.snapshot();
    snap[0] = null;

    assert.equal(field.get(0).instanceId, 'a');
});
