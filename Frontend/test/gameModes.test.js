import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GAME_MODES } from '../src/game/gameModes.js';
import GameComposer from '../src/app/GameComposer.js';
import { GAME_CONFIG } from '../src/helpers/constants.js';

test('el catálogo define objetivos y límites de cada modo', () => {
    assert.equal(GAME_MODES.clasico.usesGems, false);

    assert.equal(GAME_MODES.gemas.usesGems, true);
    assert.equal(GAME_MODES.gemas.matchTimeMs, null);
    assert.equal(GAME_MODES.gemas.maxTurns, null);

    assert.equal(GAME_MODES.contrarreloj.usesGems, true);
    assert.equal(GAME_MODES.contrarreloj.requiresField, true);
    assert.ok(GAME_MODES.contrarreloj.matchTimeMs);
    assert.equal(GAME_MODES.contrarreloj.maxTurns, null);

    assert.equal(GAME_MODES.turnos30.usesGems, true);
    assert.equal(GAME_MODES.turnos30.requiresField, true);
    assert.equal(GAME_MODES.turnos30.matchTimeMs, null);
    assert.ok(GAME_MODES.turnos30.maxTurns);
});

test('cada modalidad configura el ritmo de acciones y el límite de turno correspondiente', () => {
    const timedMatch = GameComposer.createMatch({
        config: GAME_CONFIG,
        mode: GAME_MODES.contrarreloj
    });
    const challengeMatch = GameComposer.createMatch({
        config: GAME_CONFIG,
        mode: GAME_MODES.turnos30
    });

    assert.equal(timedMatch.turn.config.ACTIONS_PER_TURN, 1);
    assert.equal(timedMatch.turn.config.TURN_TIME_LIMIT_MS, GAME_CONFIG.TURN_TIME_LIMIT_MS);
    assert.equal(challengeMatch.turn.config.ACTIONS_PER_TURN, GAME_CONFIG.ACTIONS_PER_TURN);
    assert.equal(challengeMatch.turn.config.TURN_TIME_LIMIT_MS, 10000);
});
