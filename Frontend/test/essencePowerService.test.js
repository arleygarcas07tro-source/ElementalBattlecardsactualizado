import { test } from 'node:test';
import assert from 'node:assert/strict';

import EssencePowerService from '../src/game/EssencePowerService.js';
import { CARD_TYPES } from '../src/helpers/constants.js';
import Player from '../src/game_objects/player.js';
import CardEntity from '../src/game/CardEntity.js';
import { CardDefinitions } from '../src/game_objects/card-definitions.js';

function makePlayer() {
    return new Player('opponent');
}

function card(type, level = 1) {
    return CardEntity.create(CardDefinitions[`${type}-${level}`], { owner: 'opponent' });
}

const baseCtx = {
    isPlayerTurn: true,
    usedThisTurn: false,
    essenceActive: true,
    graveyard: [{ id: 'fuego-1' }],
    opponentHand: [{ id: 'agua-1' }]
};

test('EssencePowerService: plan rechaza un tipo desconocido', () => {
    const r = EssencePowerService.plan('ether', baseCtx);

    assert.equal(r.ok, false);
    assert.equal(r.reason, 'tipo-desconocido');
});

test('EssencePowerService: plan rechaza fuera del turno del jugador', () => {
    const r = EssencePowerService.plan(CARD_TYPES.FUEGO, { ...baseCtx, isPlayerTurn: false });

    assert.equal(r.ok, false);
    assert.equal(r.reason, 'es-tu-turno');
});

test('EssencePowerService: plan rechaza si ya se usó el poder este turno', () => {
    const r = EssencePowerService.plan(CARD_TYPES.FUEGO, { ...baseCtx, usedThisTurn: true });

    assert.equal(r.ok, false);
    assert.equal(r.reason, 'poder-ya-usado');
});

test('EssencePowerService: plan rechaza una esencia inactiva', () => {
    const r = EssencePowerService.plan(CARD_TYPES.FUEGO, { ...baseCtx, essenceActive: false });

    assert.equal(r.ok, false);
    assert.equal(r.reason, 'esencia-inactiva');
});

test('EssencePowerService: Agua exige cementerio', () => {
    const r = EssencePowerService.plan(CARD_TYPES.AGUA, { ...baseCtx, graveyard: [] });

    assert.equal(r.ok, false);
    assert.equal(r.reason, 'sin-cementerio');
});

test('EssencePowerService: Sombra exige mano del rival', () => {
    const r = EssencePowerService.plan(CARD_TYPES.SOMBRA, { ...baseCtx, opponentHand: [] });

    assert.equal(r.ok, false);
    assert.equal(r.reason, 'rival-sin-mano');
});

test('EssencePowerService: plan acepta un poder válido', () => {
    const r = EssencePowerService.plan(CARD_TYPES.FUEGO, baseCtx);

    assert.equal(r.ok, true);
    assert.equal(r.name, 'Ráfaga');
});

test('EssencePowerService: getInfo devuelve null para tipos desconocidos', () => {
    assert.equal(EssencePowerService.getInfo('ether'), null);
    assert.equal(EssencePowerService.getInfo(CARD_TYPES.PLANTA).name, 'Brotar');
});

test('EssencePowerService: rescueGraveyardCard rescata la última carta base', () => {
    const p = makePlayer();
    p.addCardDataToGraveyard({ type: 'agua', level: 1 });

    const rescued = EssencePowerService.rescueGraveyardCard(p);

    assert.equal(rescued.type, 'agua');
    assert.equal(rescued.level, 1);
    assert.ok(rescued.instanceId);
    assert.equal(p.graveyard.length, 0);
    assert.equal(p.hand.length, 1);
});

test('EssencePowerService: rescueGraveyardCard sin cementerio devuelve null', () => {
    const p = makePlayer();

    assert.equal(EssencePowerService.rescueGraveyardCard(p), null);
});

test('EssencePowerService: stealHighestCard descarta la de mayor nivel', () => {
    const p = makePlayer();
    p.hand.push(card('fuego', 1), card('agua', 3), card('luz', 2));

    const discarded = EssencePowerService.stealHighestCard(p);

    assert.equal(discarded.level, 3);
    assert.equal(p.hand.length, 2);
    assert.equal(p.graveyard.length, 4);
});

test('EssencePowerService: stealHighestCard sin mano devuelve null', () => {
    const p = makePlayer();

    assert.equal(EssencePowerService.stealHighestCard(p), null);
});
