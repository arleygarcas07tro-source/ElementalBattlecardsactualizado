import { test } from 'node:test';
import assert from 'node:assert/strict';

import EssenceManager from '../src/game_objects/essences.js';
import { CARD_TYPES } from '../src/helpers/constants.js';

test('EssenceManager: todas las esencias desactivadas al inicio', () => {
    const e = new EssenceManager();

    assert.equal(e.size, 0);
    Object.values(CARD_TYPES).forEach(type => assert.equal(e.has(type), false));
});

test('EssenceManager: activate activa una esencia y actualiza size', () => {
    const e = new EssenceManager();

    e.activate(CARD_TYPES.FUEGO);

    assert.equal(e.has(CARD_TYPES.FUEGO), true);
    assert.equal(e.size, 1);
});

test('EssenceManager: activate ignora un tipo desconocido', () => {
    const e = new EssenceManager();

    e.activate('ether');

    assert.equal(e.size, 0);
    assert.equal(e.has('ether'), false);
});

test('EssenceManager: getAll devuelve una copia del estado', () => {
    const e = new EssenceManager();
    e.activate(CARD_TYPES.AGUA);

    const all = e.getAll();
    all[CARD_TYPES.FUEGO] = true;

    assert.equal(e.has(CARD_TYPES.FUEGO), false);
    assert.equal(all[CARD_TYPES.AGUA], true);
});
