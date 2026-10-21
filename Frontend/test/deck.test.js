import { test } from 'node:test';
import assert from 'node:assert/strict';

import Deck from '../src/game_objects/deck.js';
import { CARD_TYPES, GAME_CONFIG } from '../src/helpers/constants.js';

test('Deck: crea el mazo inicial de 48 cartas (8 por tipo, nivel 1)', () => {
    const deck = new Deck('player');

    assert.equal(deck.getCardsCount(), GAME_CONFIG.INITIAL_DECK_SIZE);

    const byType = {};
    deck.cards.forEach(card => {
        byType[card.type] = (byType[card.type] || 0) + 1;
        assert.equal(card.level, 1);
        assert.equal(card.owner, 'player');
    });
    Object.values(CARD_TYPES).forEach(type => assert.equal(byType[type], 8));
});

test('Deck: draw extrae la carta superior y reduce el contador', () => {
    const deck = new Deck('player');
    const top = deck.cards[deck.cards.length - 1];

    const drawn = deck.draw();

    assert.equal(drawn, top);
    assert.equal(deck.getCardsCount(), GAME_CONFIG.INITIAL_DECK_SIZE - 1);
});

test('Deck: draw sobre mazo vacío devuelve undefined', () => {
    const deck = new Deck('player');
    deck.cards = [];

    assert.equal(deck.draw(), undefined);
});

test('Deck: shuffle conserva todas las cartas', () => {
    const deck = new Deck('player');

    deck.shuffle();

    assert.equal(deck.cards.length, GAME_CONFIG.INITIAL_DECK_SIZE);
});
