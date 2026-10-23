import { test } from 'node:test';
import assert from 'node:assert/strict';

import TurnManager from '../src/game/TurnManager.js';

test('TurnManager: estado inicial', () => {
    const t = new TurnManager();

    assert.equal(t.state, 'pre-start');
    assert.equal(t.playerTurnNumber, 0);
    assert.equal(t.opponentTurnNumber, 0);
    assert.equal(t.blockingAnimations, 0);
    assert.equal(t.pendingTurnChange, null);
});

test('TurnManager: beginPlayerTurn avanza el turno y no obliga a atacar al inicio', () => {
    const t = new TurnManager();

    const info = t.beginPlayerTurn();

    assert.equal(t.state, 'player-turn');
    assert.equal(info.turnNumber, 1);
    assert.equal(info.mustAttack, false);
});

test('TurnManager: obliga a atacar tras MANDATORY_ATTACK_TURN-1 turnos sin atacar', () => {
    const t = new TurnManager();
    t.beginPlayerTurn();
    t.finishPlayerTurn();
    t.beginPlayerTurn();
    t.finishPlayerTurn();

    const info = t.beginPlayerTurn();

    assert.equal(info.mustAttack, true);
    assert.equal(info.turnsSinceLastAttack, 2);
});

test('TurnManager: un ataque resetea turnsSinceLastAttack', () => {
    const t = new TurnManager();
    t.beginPlayerTurn();
    t.playerPerformedAttackThisTurn = true;
    t.consumePlayerAction();

    const r = t.finishPlayerTurn();

    assert.equal(r.turnsSinceLastAttack, 0);
    assert.equal(r.inactiveTurns, 0);
});

test('TurnManager: la inactividad acumula y se resetea al actuar', () => {
    const t = new TurnManager();
    t.beginPlayerTurn();
    t.finishPlayerTurn();
    assert.equal(t.playerInactiveTurns, 1);

    t.beginPlayerTurn();
    t.consumePlayerAction();
    t.finishPlayerTurn();

    assert.equal(t.playerInactiveTurns, 0);
});

test('TurnManager: bloqueos retienen el cambio de turno hasta completarse', () => {
    const t = new TurnManager();
    t.onBlockingAnimationStarted();

    assert.equal(t.requestTurnEnd('player'), false);
    assert.equal(t.pendingTurnChange, 'player');
    assert.equal(t.onBlockingAnimationCompleted(), 'player');
    assert.equal(t.pendingTurnChange, null);
});

test('TurnManager: onBlockingAnimationCompleted sin pendiente no devuelve turno', () => {
    const t = new TurnManager();

    assert.equal(t.onBlockingAnimationCompleted(), null);
    assert.equal(t.blockingAnimations, 0);
});

test('TurnManager: flujo del oponente', () => {
    const t = new TurnManager();

    const info = t.beginOpponentTurn();
    assert.equal(info.turnNumber, 1);
    assert.equal(t.state, 'opponent-turn');

    t.opponentPerformedAttackThisTurn = true;
    const r = t.finishOpponentTurn(true);
    assert.equal(r.inactiveTurns, 0);
    assert.equal(r.turnsSinceLastAttack, 0);

    t.beginOpponentTurn();
    t.finishOpponentTurn(false);
    assert.equal(t.opponentInactiveTurns, 1);
    assert.equal(t.opponentTurnsSinceLastAttack, 1);
});

test('TurnManager: finishForcedAttackSkip no penaliza inactividad', () => {
    const t = new TurnManager();
    t.beginPlayerTurn();
    t.playerInactiveTurns = 2;

    const r = t.finishForcedAttackSkip();

    assert.equal(t.playerHasActed, true);
    assert.equal(r.inactiveTurns, 0);
    assert.equal(r.turnsSinceLastAttack, 0);
});

test('TurnManager: beginOpponentWait deja el estado en turno del oponente', () => {
    const t = new TurnManager();

    assert.equal(t.beginOpponentWait(), 'opponent-turn');
    assert.equal(t.state, 'opponent-turn');
});

test('TurnManager: reset vuelve al estado inicial', () => {
    const t = new TurnManager();
    t.beginPlayerTurn();
    t.playerNextAttackBreaksTie = true;

    t.reset();

    assert.equal(t.state, 'pre-start');
    assert.equal(t.playerTurnNumber, 0);
    assert.equal(t.playerNextAttackBreaksTie, false);
});
