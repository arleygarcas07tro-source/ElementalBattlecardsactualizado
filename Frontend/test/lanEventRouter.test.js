import { test } from 'node:test';
import assert from 'node:assert/strict';

import LANEventRouter from '../src/game/LANEventRouter.js';
import GameMatch from '../src/game/GameMatch.js';
import { GAME_CONFIG } from '../src/helpers/constants.js';

function makeRouter(playerRole = 'host') {
    const match = new GameMatch({ config: GAME_CONFIG });
    match.startOpponentTurn();
    return { match, router: new LANEventRouter({ match, playerRole }) };
}

test('LANEventRouter: ignora payloads inválidos', () => {
    const { router } = makeRouter();

    assert.equal(router.route(null), null);
    assert.equal(router.route({}), null);
});

test('LANEventRouter: ignora el eco del propio emisor', () => {
    const { router } = makeRouter('host');

    assert.equal(router.route({ type: 'attack', playerRole: 'host' }), null);
});

test('LANEventRouter: play_card remoto actualiza el campo del oponente', () => {
    const { match, router } = makeRouter('host');
    const card = { id: 'fuego-1', type: 'fuego', level: 1, instanceId: 'x' };

    const result = router.route({ type: 'play_card', playerRole: 'guest', fieldIndex: 2, card });

    assert.equal(result.isRemotePlayer, true);
    assert.equal(result.effects[0].kind, 'play-card');
    assert.equal(match.opponent.field.get(2).instanceId, 'x');
    assert.equal(match.turn.opponentHasActed, true);
});

test('LANEventRouter: fuse_cards limpia el origen y coloca el resultado', () => {
    const { match, router } = makeRouter('host');
    match.opponent.field.set(0, { instanceId: 'a', type: 'fuego', level: 1 });
    const resultCard = { instanceId: 'fused', type: 'fuego', level: 2 };

    const result = router.route({ type: 'fuse_cards', playerRole: 'guest', sourceIndex: 0, targetIndex: 1, resultCard });

    assert.equal(result.effects[0].kind, 'fuse-cards');
    assert.equal(match.opponent.field.get(0), null);
    assert.equal(match.opponent.field.get(1).instanceId, 'fused');
});

test('LANEventRouter: una fusión remota de nivel 3 suma una gema', () => {
    const match = new GameMatch({
        config: GAME_CONFIG,
        mode: { usesGems: true },
        gemRequirements: { fuego: 1 }
    });
    match.startOpponentTurn();
    const router = new LANEventRouter({ match, playerRole: 'host' });

    router.route({
        type: 'fuse_cards',
        playerRole: 'guest',
        sourceIndex: 0,
        targetIndex: 1,
        resultCard: { instanceId: 'fuego-3', type: 'fuego', level: 3 }
    });

    assert.equal(match.opponent.gems.count('fuego'), 1);
});

test('LANEventRouter: attack remoto marca el ataque del oponente', () => {
    const { match, router } = makeRouter('host');
    match.player.field.set(0, { instanceId: 'target', type: 'fuego', level: 1, health: 100 });

    const result = router.route({ type: 'attack', playerRole: 'guest', attackerIndex: 0, defenderIndex: 0, result: { winner: 'attacker' } });

    assert.equal(result.effects[0].kind, 'attack');
    assert.equal(match.turn.opponentPerformedAttackThisTurn, true);
    assert.equal(match.turn.opponentHasActed, true);
});

test('LANEventRouter: aplica el daño recibido a la vida del defensor local', () => {
    const { match, router } = makeRouter('host');
    match.player.field.set(0, { instanceId: 'target', type: 'fuego', level: 1, health: 100 });

    const result = router.route({
        type: 'attack',
        playerRole: 'guest',
        attackerIndex: 1,
        defenderIndex: 0,
        result: { damage: 35, defenderHealth: 65, winner: 'none', loser: 'none' }
    });

    assert.equal(match.player.field.get(0).health, 65);
    assert.equal(result.effects[0].result.defenderHealth, 65);
});

test('LANEventRouter: direct_attack remoto devuelve el efecto sin mutar el turno', () => {
    const { router } = makeRouter('host');

    const result = router.route({ type: 'direct_attack', playerRole: 'guest', attackerIndex: 3, essenceType: 'fuego' });

    assert.equal(result.effects[0].kind, 'direct-attack');
    assert.equal(result.effects[0].attackerIndex, 3);
});

test('LANEventRouter: traduce game_over al punto de vista local', () => {
    const { router } = makeRouter('host');

    const result = router.route({
        type: 'game_over',
        playerRole: 'guest',
        winner: 'player',
        reason: 'opponentInactive'
    });

    assert.equal(result.effects[0].kind, 'game-over');
    assert.equal(result.effects[0].winner, 'opponent');
    assert.equal(result.effects[0].reason, 'playerInactive');
});

test('LANEventRouter: conserva el empate en game_over', () => {
    const { router } = makeRouter('host');

    const result = router.route({
        type: 'game_over',
        playerRole: 'guest',
        winner: null,
        reason: 'timeExpired'
    });

    assert.equal(result.effects[0].winner, null);
    assert.equal(result.effects[0].reason, 'timeExpired');
});

test('LANEventRouter: ignora tipos de evento no manejados', () => {
    const { router } = makeRouter('host');

    assert.equal(router.route({ type: 'desconocido', playerRole: 'guest' }), null);
});
