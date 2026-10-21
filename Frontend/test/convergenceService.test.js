import { test } from 'node:test';
import assert from 'node:assert/strict';

import ConvergenceService from '../src/game/ConvergenceService.js';

test('ConvergenceService: isConverged true al alcanzar el requerido', () => {
    const types = new Set(['fuego', 'agua', 'planta', 'luz', 'sombra', 'espiritu']);

    assert.equal(ConvergenceService.isConverged(types, 6), true);
});

test('ConvergenceService: isConverged false por debajo del requerido', () => {
    assert.equal(ConvergenceService.isConverged(new Set(['fuego', 'agua']), 6), false);
});

test('ConvergenceService: isConverged false con set nulo', () => {
    assert.equal(ConvergenceService.isConverged(null, 6), false);
});

test('ConvergenceService: missingCount cuenta los tipos faltantes', () => {
    assert.equal(ConvergenceService.missingCount(new Set(['fuego', 'agua']), 6), 4);
    assert.equal(ConvergenceService.missingCount(null, 6), 6);
    assert.equal(ConvergenceService.missingCount(new Set(['fuego', 'agua', 'planta', 'luz', 'sombra', 'espiritu']), 6), 0);
});
