import { test } from 'node:test';
import assert from 'node:assert/strict';

import CardHealthService from '../src/game/CardHealthService.js';

test('CardHealthService: inicia cartas sin valor de vida en 100%', () => {
    const card = {};

    assert.equal(CardHealthService.ensure(card), 100);
    assert.equal(card.health, 100);
});

test('CardHealthService: suma la vida al fusionar y limita el resultado a 100%', () => {
    assert.equal(CardHealthService.fusionHealth({ health: 35 }, { health: 40 }), 75);
    assert.equal(CardHealthService.fusionHealth({ health: 70 }, { health: 60 }), 100);
});
