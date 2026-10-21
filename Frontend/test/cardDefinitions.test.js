import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CardDefinitions, getBaseCardTypes } from '../src/game_objects/card-definitions.js';
import { CARD_TYPES } from '../src/helpers/constants.js';

test('CardDefinitions: contiene 18 cartas (6 tipos x 3 niveles)', () => {
    assert.equal(Object.keys(CardDefinitions).length, 18);
});

test('CardDefinitions: el id de cada carta coincide con type-level', () => {
    Object.values(CardDefinitions).forEach(def => {
        assert.equal(def.id, `${def.type}-${def.level}`);
        assert.ok(def.level >= 1 && def.level <= 3);
    });
});

test('getBaseCardTypes devuelve exactamente los 6 tipos del dominio', () => {
    const baseTypes = getBaseCardTypes().sort();
    const domainTypes = Object.values(CARD_TYPES).sort();

    assert.deepEqual(baseTypes, domainTypes);
});
