import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveCombat } from '../src/helpers/combat.js';

test('combat: un ataque neutral causa 25% de daño', () => {
    const defender = { type: 'luz', level: 1, health: 100 };
    const result = resolveCombat({ type: 'fuego', level: 1 }, defender);

    assert.equal(result.damage, 25);
    assert.equal(result.defenderHealth, 75);
    assert.equal(result.destroyed, false);
    assert.equal(defender.health, 75);
});

test('combat: la ventaja elemental suma 15% de daño', () => {
    const result = resolveCombat(
        { type: 'fuego', level: 1 },
        { type: 'planta', level: 1, health: 100 }
    );

    assert.equal(result.damage, 40);
    assert.equal(result.defenderHealth, 60);
});

test('combat: la desventaja elemental resta 15% de daño', () => {
    const result = resolveCombat(
        { type: 'planta', level: 1 },
        { type: 'fuego', level: 1, health: 100 }
    );

    assert.equal(result.damage, 10);
    assert.equal(result.defenderHealth, 90);
});

test('combat: cada nivel del atacante añade 5% de daño neutral', () => {
    const damages = [1, 2, 3].map((level) => {
        const result = resolveCombat(
            { type: 'fuego', level },
            { type: 'luz', level: 1, health: 100 }
        );
        return result.damage;
    });

    assert.deepEqual(damages, [25, 30, 35]);
});

test('combat: el nivel del defensor no reduce el daño del atacante', () => {
    const attacker = { type: 'fuego', level: 3 };
    const againstLevelOne = resolveCombat(attacker, { type: 'luz', level: 1, health: 100 });
    const againstLevelThree = resolveCombat(attacker, { type: 'luz', level: 3, health: 100 });

    assert.equal(againstLevelOne.damage, 35);
    assert.equal(againstLevelThree.damage, 35);
});

test('combat: el daño mínimo es 5% y el máximo es 100%', () => {
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

    assert.equal(minimum.damage, 5);
    assert.equal(maximum.damage, 100);
    assert.equal(maximum.defenderHealth, 0);
    assert.equal(maximum.destroyed, true);
    assert.equal(maximum.loser, 'defender');
});

test('combat: la carta se destruye cuando su vida llega a cero', () => {
    const defender = { type: 'planta', level: 1, health: 30 };
    const result = resolveCombat({ type: 'fuego', level: 1 }, defender);

    assert.equal(result.damage, 40);
    assert.equal(result.defenderHealth, 0);
    assert.equal(result.destroyed, true);
    assert.equal(result.winner, 'attacker');
    assert.equal(defender.health, 0);
});
