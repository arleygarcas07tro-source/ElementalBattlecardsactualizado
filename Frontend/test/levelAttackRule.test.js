import { test } from 'node:test';
import assert from 'node:assert/strict';

import LevelAttackRule from '../src/game/LevelAttackRule.js';

test('LevelAttackRule: primer ataque nivel 1 no bloquea', () => {
    const r = LevelAttackRule.registerAttack({ level: 1, nowTurn: 1 });

    assert.deepEqual(r, { lastAttackedTurn: 1, consecutiveAttacks: 1, blockedTurn: null });
});

test('LevelAttackRule: nivel 1 encadena ataques consecutivos sin bloquear', () => {
    const r = LevelAttackRule.registerAttack({ level: 1, nowTurn: 2, lastAttackedTurn: 1, consecutiveAttacks: 1 });

    assert.equal(r.consecutiveAttacks, 2);
    assert.equal(r.blockedTurn, null);
});

test('LevelAttackRule: nivel 2 se bloquea al segundo ataque consecutivo', () => {
    const r = LevelAttackRule.registerAttack({ level: 2, nowTurn: 2, lastAttackedTurn: 1, consecutiveAttacks: 1 });

    assert.equal(r.blockedTurn, 3);
    assert.equal(r.consecutiveAttacks, 0);
});

test('LevelAttackRule: nivel 3 se bloquea siempre tras atacar', () => {
    const r = LevelAttackRule.registerAttack({ level: 3, nowTurn: 5 });

    assert.equal(r.blockedTurn, 6);
});

test('LevelAttackRule: ataques no consecutivos reinician el contador', () => {
    const r = LevelAttackRule.registerAttack({ level: 2, nowTurn: 5, lastAttackedTurn: 1, consecutiveAttacks: 3 });

    assert.equal(r.consecutiveAttacks, 1);
    assert.equal(r.blockedTurn, null);
});

test('LevelAttackRule: startOfTurn conserva consecutivos si atacó el turno anterior', () => {
    const r = LevelAttackRule.startOfTurn({ lastAttackedTurn: 4, consecutiveAttacks: 2, blockedTurn: 5 }, 5);

    assert.equal(r.consecutiveAttacks, 2);
    assert.equal(r.blockedTurn, 5);
});

test('LevelAttackRule: startOfTurn resetea consecutivos y limpia bloqueos vencidos', () => {
    const r = LevelAttackRule.startOfTurn({ lastAttackedTurn: 2, consecutiveAttacks: 2, blockedTurn: 3 }, 5);

    assert.equal(r.consecutiveAttacks, 0);
    assert.equal(r.blockedTurn, null);
});
