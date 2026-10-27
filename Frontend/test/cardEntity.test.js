import { test } from 'node:test';
import assert from 'node:assert/strict';

import CardEntity from '../src/game/CardEntity.js';

test('CardEntity.create asigna instanceId y conserva la definición', () => {
    const definition = { id: 'fuego-1', type: 'fuego', level: 1 };
    const entity = CardEntity.create(definition);

    assert.equal(entity.id, 'fuego-1');
    assert.equal(entity.type, 'fuego');
    assert.equal(entity.level, 1);
    assert.equal(typeof entity.instanceId, 'string');
    assert.notEqual(entity.instanceId, '');
    assert.notEqual(entity.instanceId, definition.instanceId);
});

test('CardEntity.create añade owner cuando se indica', () => {
    const entity = CardEntity.create({ id: 'agua-1', type: 'agua', level: 1 }, { owner: 'player' });
    assert.equal(entity.owner, 'player');
});

test('CardEntity.create asigna la vida real según el nivel', () => {
    const level2 = CardEntity.create({ id: 'agua-2', type: 'agua', level: 2 });
    const level3 = CardEntity.create({ id: 'agua-3', type: 'agua', level: 3 });

    assert.equal(level2.maxHealth, 150);
    assert.equal(level2.health, 150);
    assert.equal(level3.maxHealth, 200);
    assert.equal(level3.health, 200);
});

test('CardEntity.create reutiliza instanceId salvo forceNewId', () => {
    const definition = { id: 'luz-1', type: 'luz', level: 1, instanceId: 'existente' };
    assert.equal(CardEntity.create(definition).instanceId, 'existente');
    assert.notEqual(CardEntity.create(definition, { forceNewId: true }).instanceId, 'existente');
});

test('CardEntity.create devuelve null sin definición', () => {
    assert.equal(CardEntity.create(null), null);
});

test('CardEntity.ensureInstance genera instanceId solo si falta', () => {
    const sin = { type: 'planta', level: 1 };
    const con = { type: 'planta', level: 1, instanceId: 'ya' };

    assert.equal(typeof CardEntity.ensureInstance(sin).instanceId, 'string');
    assert.equal(CardEntity.ensureInstance(con).instanceId, 'ya');
});

test('CardEntity.fused crea la carta de nivel superior', () => {
    const fused = CardEntity.fused({ type: 'sombra', level: 1 });
    assert.equal(fused.id, 'sombra-2');
    assert.equal(fused.level, 2);
    assert.equal(typeof fused.instanceId, 'string');
});

test('CardEntity.fused conserva el porcentaje de vida sobre el nuevo máximo', () => {
    const fused = CardEntity.fused(
        { type: 'sombra', level: 1, health: 45, maxHealth: 100 },
        { type: 'sombra', level: 1, health: 35, maxHealth: 100 }
    );

    assert.equal(fused.maxHealth, 150);
    assert.equal(fused.health, 120);
});

test('CardEntity.fused devuelve null en nivel máximo', () => {
    assert.equal(CardEntity.fused({ type: 'sombra', level: 3 }), null);
});

test('CardEntity.areFusionable exige mismo tipo, mismo nivel y < 3', () => {
    assert.equal(CardEntity.areFusionable({ type: 'fuego', level: 1 }, { type: 'fuego', level: 1 }), true);
    assert.equal(CardEntity.areFusionable({ type: 'fuego', level: 1 }, { type: 'agua', level: 1 }), false);
    assert.equal(CardEntity.areFusionable({ type: 'fuego', level: 1 }, { type: 'fuego', level: 2 }), false);
    assert.equal(CardEntity.areFusionable({ type: 'fuego', level: 3 }, { type: 'fuego', level: 3 }), false);
    assert.equal(CardEntity.areFusionable(null, { type: 'fuego', level: 1 }), false);
});