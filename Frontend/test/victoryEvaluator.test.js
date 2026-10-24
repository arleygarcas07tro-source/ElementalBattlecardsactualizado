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

test('VictoryEvaluator: Gemas requiere cumplir el objetivo de gemas y controlar el campo', () => {
    const player = {
        ...stateWithEssences(0),
        field: { types: () => new Set(['fuego', 'agua', 'planta', 'luz', 'sombra', 'espiritu']) }
    };
    const gems = { meetsAll: () => true };
    const r = VictoryEvaluator.evaluate({
        player,
        opponent: stateWithEssences(0),
        turn: noInactivity,
        mode: { usesGems: true },
        gems: { player: gems, opponent: gems }
    });

    assert.equal(r.winner, 'player');
    assert.equal(r.reason, 'playerObjectives');
});

test('VictoryEvaluator: Contrarreloj requiere gemas y control de campo', () => {
    const player = {
        ...stateWithEssences(0),
        field: { types: () => new Set(['fuego', 'agua', 'planta', 'luz', 'sombra', 'espiritu']) }
    };
    const r = VictoryEvaluator.evaluate({
        player,
        opponent: stateWithEssences(0),
        turn: noInactivity,
        mode: { usesGems: true, matchTimeMs: 180000 },
        gems: {
            player: { meetsAll: () => true },
            opponent: { meetsAll: () => false }
        }
    });

    assert.equal(r.winner, 'player');
    assert.equal(r.reason, 'playerObjectives');
});

test('VictoryEvaluator: un jugador agotado permite al rival terminar sus turnos', () => {
    const r = VictoryEvaluator.evaluate({
        player: stateWithEssences(0),
        opponent: stateWithEssences(0),
        turn: { ...noInactivity, playerTurnNumber: 30, opponentTurnNumber: 29 },
        mode: { usesGems: true, maxTurns: 30 },
        gems: {
            player: { meetsAll: () => false },
            opponent: { meetsAll: () => false }
        }
    });

    assert.equal(r.winner, null);
    assert.equal(r.reason, 'playerTurnLimit');
});

test('VictoryEvaluator: ambos jugadores pierden al agotar sus 30 turnos', () => {
    const r = VictoryEvaluator.evaluate({
        player: stateWithEssences(0),
        opponent: stateWithEssences(0),
        turn: { ...noInactivity, playerTurnNumber: 30, opponentTurnNumber: 30 },
        mode: { usesGems: true, maxTurns: 30 },
        gems: {
            player: { meetsAll: () => false },
            opponent: { meetsAll: () => false }
        }
    });

    assert.equal(r.winner, null);
    assert.equal(r.reason, 'bothTurnLimits');
});

test('VictoryEvaluator: el límite de tiempo deja sin ganador si nadie cumple objetivos', () => {
    const r = VictoryEvaluator.evaluate({
        player: stateWithEssences(0),
        opponent: stateWithEssences(0),
        turn: noInactivity,
        mode: { usesGems: true, matchTimeMs: 180000 },
        gems: {
            player: { meetsAll: () => false },
            opponent: { meetsAll: () => false }
        },
        timeExpired: true
    });

    assert.equal(r.winner, null);
    assert.equal(r.reason, 'timeExpired');
});
