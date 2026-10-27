import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveCombat } from '../src/helpers/combat.js';

test('combat: nivel 1 contra nivel 1 causa 5% de daño neutral', () => {
    const defender = { type: 'luz', level: 1, health: 100 };
    const result = resolveCombat({ type: 'fuego', level: 1 }, defender);

    assert.equal(result.damage, 5);
    assert.equal(result.defenderHealth, 95);
    assert.equal(result.destroyed, false);
    assert.equal(defender.health, 95);
});

test('combat: las cartas de mayor nivel tienen más vida real', () => {
    const defender = { type: 'luz', level: 2, health: 150, maxHealth: 150 };
    const result = resolveCombat({ type: 'fuego', level: 1 }, defender);

    assert.equal(result.damage, 5);
    assert.equal(result.defenderHealth, 142);
    assert.equal(defender.health, 142);
});

test('combat: la ventaja elemental suma 15% de daño', () => {
    const result = resolveCombat(
        { type: 'fuego', level: 1 },
        { type: 'planta', level: 1, health: 100 }
    );

    assert.equal(result.damage, 20);
    assert.equal(result.defenderHealth, 80);
});

test('combat: la desventaja elemental resta 15% y el daño no puede ser negativo', () => {
    const result = resolveCombat(
        { type: 'planta', level: 1 },
        { type: 'fuego', level: 1, health: 100 }
    );

    assert.equal(result.damage, 0);
    assert.equal(result.defenderHealth, 100);
});

test('combat: aplica la tabla de daño por nivel del atacante y defensor', () => {
    const expected = [
        [5, 5, 2],
        [35, 10, 25],
        [50, 45, 10]
    ];

    expected.forEach((row, attackerIndex) => {
        row.forEach((damage, defenderIndex) => {
            const result = resolveCombat(
                { type: 'fuego', level: attackerIndex + 1 },
                { type: 'luz', level: defenderIndex + 1, health: 100 }
            );
            assert.equal(result.damage, damage, `nivel ${attackerIndex + 1} contra ${defenderIndex + 1}`);
        });
    });
});

test('combat: el daño queda entre 0% y 100%, incluyendo bonus', () => {
    const minimum = resolveCombat(
        { type: 'planta', level: 1 },
        { type: 'fuego', level: 1, health: 100 },
        { bonusDamage: -20 }
    );
    const maximum = resolveCombat(
        { type: 'fuego', level: 3 },
        { type: 'planta', level: 1, health: 100 },
        { bonusDamage: 100 }
    );

    assert.equal(minimum.damage, 0);
    assert.equal(maximum.damage, 100);
    assert.equal(maximum.defenderHealth, 0);
    assert.equal(maximum.destroyed, true);
    assert.equal(maximum.loser, 'defender');
});

test('combat: la carta se destruye cuando su vida llega a cero', () => {
    const defender = { type: 'planta', level: 1, health: 20 };
    const result = resolveCombat({ type: 'fuego', level: 1 }, defender);

    assert.equal(result.damage, 20);
    assert.equal(result.defenderHealth, 0);
    assert.equal(result.destroyed, true);
    assert.equal(result.winner, 'attacker');
    assert.equal(defender.health, 0);
});
