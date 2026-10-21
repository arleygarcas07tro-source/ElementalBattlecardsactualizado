import { test } from 'node:test';
import assert from 'node:assert/strict';

import VictoryEvaluator from '../src/game/VictoryEvaluator.js';

function stateWithEssences(size) {
    return { essences: { size } };
}

const noInactivity = { playerInactiveTurns: 0, opponentInactiveTurns: 0 };

test('VictoryEvaluator: sin condiciones no hay ganador', () => {
    const r = VictoryEvaluator.evaluate({
        player: stateWithEssences(0),
        opponent: stateWithEssences(0),
        turn: noInactivity
    });

    assert.equal(r.winner, null);
    assert.equal(r.reason, null);
});

test('VictoryEvaluator: inactividad del jugador da victoria al oponente', () => {
    const r = VictoryEvaluator.evaluate({
        player: stateWithEssences(0),
        opponent: stateWithEssences(0),
        turn: { playerInactiveTurns: 3, opponentInactiveTurns: 0 }
    });

    assert.equal(r.winner, 'opponent');
    assert.equal(r.reason, 'playerInactive');
});

test('VictoryEvaluator: inactividad del oponente da victoria al jugador', () => {
    const r = VictoryEvaluator.evaluate({
        player: stateWithEssences(0),
        opponent: stateWithEssences(0),
        turn: { playerInactiveTurns: 0, opponentInactiveTurns: 3 }
    });

    assert.equal(r.winner, 'player');
    assert.equal(r.reason, 'opponentInactive');
});

test('VictoryEvaluator: el jugador gana con las 6 esencias', () => {
    const r = VictoryEvaluator.evaluate({
        player: stateWithEssences(6),
        opponent: stateWithEssences(0),
        turn: noInactivity
    });

    assert.equal(r.winner, 'player');
    assert.equal(r.reason, 'playerEssences');
});

test('VictoryEvaluator: el oponente gana con las 6 esencias', () => {
    const r = VictoryEvaluator.evaluate({
        player: stateWithEssences(0),
        opponent: stateWithEssences(6),
        turn: noInactivity
    });

    assert.equal(r.winner, 'opponent');
    assert.equal(r.reason, 'opponentEssences');
});
