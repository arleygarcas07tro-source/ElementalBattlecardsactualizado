import { test } from 'node:test';
import assert from 'node:assert/strict';

import Player from '../src/game_objects/player.js';
import CardEntity from '../src/game/CardEntity.js';
import { CardDefinitions } from '../src/game_objects/card-definitions.js';

function makePlayer() {
    return new Player('player');
}

function card(type, level = 1) {
    return CardEntity.create(CardDefinitions[`${type}-${level}`], { owner: 'player' });
}

test('Player: estado inicial', () => {
    const p = makePlayer();

    assert.equal(p.id, 'player');
    assert.equal(p.deck.getCardsCount(), 48);
    assert.deepEqual(p.hand, []);
    assert.equal(p.field.size, 6);
    assert.deepEqual(p.graveyard, []);
});

test('Player: drawInitialHand roba 4 cartas con instanceId', () => {
    const p = makePlayer();

    p.drawInitialHand();

    assert.equal(p.hand.length, 4);
    assert.equal(p.deck.getCardsCount(), 44);
    assert.ok(p.hand.every(c => c.instanceId));
});

test('Player: drawCard sin mazo ni cementerio devuelve null', () => {
    const p = makePlayer();
    p.deck.cards = [];

    assert.equal(p.drawCard(), null);
});

test('Player: refillDeckFromGraveyard mueve el cementerio al mazo y lo vacía', () => {
    const p = makePlayer();
    p.deck.cards = [];
    p.graveyard = [card('fuego')];

    p.refillDeckFromGraveyard();

    assert.equal(p.graveyard.length, 0);
    assert.equal(p.deck.getCardsCount(), 1);
});

test('Player: playCardFromHand mueve la carta de la mano al campo', () => {
    const p = makePlayer();
    const c = card('fuego');
    p.hand.push(c);

    const played = p.playCardFromHand(c.instanceId, 2);

    assert.equal(played, c);
    assert.equal(p.hand.length, 0);
    assert.equal(p.field.get(2), c);
});

test('Player: playCardFromHand rechaza id inexistente o slot ocupado', () => {
    const p = makePlayer();
    const a = card('fuego');
    const b = card('agua');
    p.hand.push(a, b);
    p.field.set(0, a);

    assert.equal(p.playCardFromHand('nope', 1), null);
    assert.equal(p.playCardFromHand(b.instanceId, 0), null);
});

test('Player: fuseCards fusiona dos cartas iguales en el campo', () => {
    const p = makePlayer();
    const firstCard = card('fuego', 1);
    const secondCard = card('fuego', 1);
    firstCard.health = 45;
    secondCard.health = 35;
    p.field.set(0, firstCard);
    p.field.set(1, secondCard);

    const result = p.fuseCards(0, 1);

    assert.ok(result);
    assert.equal(result.newCard.level, 2);
    assert.equal(result.newCard.type, 'fuego');
    assert.equal(result.newCard.health, 80);
    assert.equal(result.emptiedIndex, 0);
    assert.equal(p.field.get(0), null);
    assert.equal(p.field.get(1).level, 2);
});

test('Player: fuseCards rechaza incompatibles, nivel máximo e índices inválidos', () => {
    const p = makePlayer();
    p.field.set(0, card('fuego', 1));
    p.field.set(1, card('agua', 1));

    assert.equal(p.fuseCards(0, 1), null);

    p.field.set(1, card('fuego', 3));
    assert.equal(p.fuseCards(0, 1), null);
    assert.equal(p.fuseCards('x', 1), null);
    assert.equal(p.fuseCards(9, 1), null);
});

test('Player: fuseFromHand fusiona una carta de la mano con el campo', () => {
    const p = makePlayer();
    const onField = card('agua', 1);
    const inHand = card('agua', 1);
    onField.health = 65;
    inHand.health = 55;
    p.field.set(3, onField);
    p.hand.push(inHand);

    const result = p.fuseFromHand(inHand.instanceId, 3);

    assert.ok(result);
    assert.equal(result.level, 2);
    assert.equal(result.health, 100);
    assert.equal(p.hand.length, 0);
    assert.equal(p.field.get(3).level, 2);
});

test('Player: fuseFromHand rechaza carta inexistente o no fusionable', () => {
    const p = makePlayer();
    p.field.set(0, card('fuego', 1));

    assert.equal(p.fuseFromHand('nope', 0), null);

    p.hand.push(card('agua', 1));
    assert.equal(p.fuseFromHand(p.hand[0].instanceId, 0), null);
});

test('Player: fillEssence activa una sola vez (regla pura, sin UI)', () => {
    const p = makePlayer();

    assert.equal(p.fillEssence('fuego'), true);
    assert.equal(p.essences.has('fuego'), true);

    assert.equal(p.fillEssence('fuego'), false);
});

test('Player: addCardDataToGraveyard descompone según el nivel', () => {
    const p = makePlayer();

    p.addCardDataToGraveyard({ type: 'fuego', level: 3 });

    assert.equal(p.graveyard.length, 4);
});
