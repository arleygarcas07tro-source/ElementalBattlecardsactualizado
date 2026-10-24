import { test } from 'node:test';
import assert from 'node:assert/strict';

import GameMatch from '../src/game/GameMatch.js';
import { CARD_TYPES, GAME_CONFIG } from '../src/helpers/constants.js';

function makeMatch() {
    return new GameMatch({ config: GAME_CONFIG });
}

function place(player, index, type, level = 1) {
    player.field.set(index, { id: `${type}-${level}`, type, level, instanceId: `${type}-${level}-${index}` });
}

function giveGems(player, type, amount) {
    player.gems.counts[type] = amount;
    return player;
}

test('GameMatch: expone jugadores, turno y configuración', () => {
    const match = makeMatch();

    assert.equal(match.player.id, 'player');
    assert.equal(match.opponent.id, 'opponent');
    assert.equal(match.turn.state, 'pre-start');
    assert.equal(match.config, GAME_CONFIG);
});

test('GameMatch.playerOf devuelve el jugador por id', () => {
    const match = makeMatch();

    assert.equal(match.playerOf('player'), match.player);
    assert.equal(match.playerOf('opponent'), match.opponent);
    assert.equal(match.playerOf('desconocido'), match.player);
});

test('GameMatch.startPlayerTurn inicia el turno del jugador', () => {
    const match = makeMatch();

    const info = match.startPlayerTurn();

    assert.equal(match.turn.state, 'player-turn');
    assert.equal(info.turnNumber, 1);
    assert.equal(typeof info.mustAttack, 'boolean');
});

test('GameMatch.startOpponentTurn inicia el turno del oponente', () => {
    const match = makeMatch();

    const info = match.startOpponentTurn();

    assert.equal(match.turn.state, 'opponent-turn');
    assert.equal(info.turnNumber, 1);
});

test('GameMatch.resolvePlayerAttack aplica daño por ventaja elemental', () => {
    const match = makeMatch();
    match.startPlayerTurn();
    place(match.player, 0, CARD_TYPES.FUEGO);
    place(match.opponent, 0, CARD_TYPES.PLANTA);

    const resolution = match.resolvePlayerAttack({ attackerIndex: 0, defenderIndex: 0 });

    assert.ok(resolution);
    assert.equal(resolution.result.damage, 40);
    assert.equal(resolution.result.defenderHealth, 60);
    assert.equal(resolution.result.winner, 'none');
    assert.equal(match.opponent.field.get(0).health, 60);
    assert.equal(resolution.attackerIndex, 0);
    assert.equal(resolution.defenderIndex, 0);
});

test('GameMatch.resolvePlayerAttack devuelve null fuera del turno del jugador', () => {
    const match = makeMatch();
    match.startOpponentTurn();
    place(match.player, 0, CARD_TYPES.FUEGO);
    place(match.opponent, 0, CARD_TYPES.PLANTA);

    assert.equal(match.resolvePlayerAttack({ attackerIndex: 0, defenderIndex: 0 }), null);
});

test('GameMatch.markPlayerAttackConsumed marca la acción y agota Ráfaga', () => {
    const match = makeMatch();
    match.startPlayerTurn();
    match.turn.playerNextAttackBreaksTie = true;

    match.markPlayerAttackConsumed();

    assert.equal(match.turn.playerHasActed, true);
    assert.equal(match.turn.playerPerformedAttackThisTurn, true);
    assert.equal(match.turn.playerTurnsSinceLastAttack, 0);
    assert.equal(match.turn.playerNextAttackBreaksTie, false);
});

test('GameMatch.useEssencePower rechaza fuera del turno del jugador', () => {
    const match = makeMatch();
    match.startOpponentTurn();

    const outcome = match.useEssencePower(CARD_TYPES.FUEGO);

    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, 'es-tu-turno');
});

test('GameMatch.useEssencePower rechaza una esencia inactiva', () => {
    const match = makeMatch();
    match.startPlayerTurn();

    const outcome = match.useEssencePower(CARD_TYPES.FUEGO);

    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, 'esencia-inactiva');
});

test('GameMatch.useEssencePower activa Ráfaga y solo permite un uso por turno', () => {
    const match = makeMatch();
    match.startPlayerTurn();
    match.player.essences.activate(CARD_TYPES.FUEGO);
    giveGems(match.player, CARD_TYPES.FUEGO, 1);

    const first = match.useEssencePower(CARD_TYPES.FUEGO);
    assert.equal(first.ok, true);
    assert.equal(first.name, 'Ráfaga');
    assert.equal(match.turn.playerNextAttackBreaksTie, true);
    assert.equal(match.player.gems.count(CARD_TYPES.FUEGO), 0);

    const second = match.useEssencePower(CARD_TYPES.FUEGO);
    assert.equal(second.ok, false);
    assert.equal(second.reason, 'poder-agotado');
});

test('GameMatch.useEssencePower rechaza sin gemas del elemento', () => {
    const match = makeMatch();
    match.startPlayerTurn();
    match.player.essences.activate(CARD_TYPES.FUEGO);

    const outcome = match.useEssencePower(CARD_TYPES.FUEGO);

    assert.equal(outcome.ok, false);
    assert.equal(outcome.reason, 'sin-gemas');
});

test('GameMatch.useEssencePower emite essence-power-used', () => {
    const match = makeMatch();
    match.startPlayerTurn();
    match.player.essences.activate(CARD_TYPES.ESPIRITU);
    giveGems(match.player, CARD_TYPES.ESPIRITU, 2);

    let emitted = null;
    match.events.on('essence-power-used', (info) => { emitted = info; });

    match.useEssencePower(CARD_TYPES.ESPIRITU);

    assert.deepEqual(emitted, { essenceType: CARD_TYPES.ESPIRITU, name: 'Conducto', gemCost: 2 });
    assert.equal(match.turn.opponentConvergenceBlocked, true);
});

test('GameMatch.useEssencePower no consume acciones del turno', () => {
    const match = makeMatch();
    match.startPlayerTurn();
    match.player.essences.activate(CARD_TYPES.FUEGO);
    giveGems(match.player, CARD_TYPES.FUEGO, 1);

    match.useEssencePower(CARD_TYPES.FUEGO);

    assert.equal(match.turn.playerActionsTaken, 0);
    assert.equal(match.turn.playerActionsRemaining, GAME_CONFIG.ACTIONS_PER_TURN);
});

test('GameMatch: consumePlayerAction descuenta del cupo y bloquea al agotarlo', () => {
    const match = makeMatch();
    match.startPlayerTurn();

    match.consumePlayerAction();
    assert.equal(match.turn.playerActionsTaken, 1);
    assert.equal(match.turn.canPlayerAct(), true);

    match.consumePlayerAction();
    assert.equal(match.turn.playerActionsTaken, 2);
    assert.equal(match.turn.canPlayerAct(), false);
});

test('GameMatch.checkVictoryConditions devuelve null sin condiciones cumplidas', () => {
    const match = makeMatch();
    match.startPlayerTurn();

    assert.equal(match.checkVictoryConditions(), null);
});

test('GameMatch.checkVictoryConditions detecta las 6 esencias', () => {
    const match = makeMatch();
    match.startPlayerTurn();
    Object.values(CARD_TYPES).forEach((type) => match.player.essences.activate(type));

    assert.equal(match.checkVictoryConditions(), 'player');
});

test('GameMatch usa el modo y los requisitos de gemas seleccionados', () => {
    const requirements = Object.fromEntries(Object.values(CARD_TYPES).map((type) => [type, 1]));
    const match = new GameMatch({
        config: GAME_CONFIG,
        mode: { usesGems: true },
        gemRequirements: requirements
    });

    Object.values(CARD_TYPES).forEach((type, index) => {
        place(match.player, index, type);
        match.player.gems.counts[type] = 1;
    });

    assert.equal(match.checkVictoryConditions(), 'player');
    assert.deepEqual(match.player.gems.requirements, requirements);
    assert.deepEqual(match.opponent.gems.requirements, requirements);
});

test('GameMatch.useEssencePower ejecuta AGUA (Rescate) vía EssencePowerService', () => {
    const match = makeMatch();
    match.startPlayerTurn();
    match.player.essences.activate(CARD_TYPES.AGUA);
    giveGems(match.player, CARD_TYPES.AGUA, 1);
    match.player.addCardDataToGraveyard({ type: 'agua', level: 1 });

    const outcome = match.useEssencePower(CARD_TYPES.AGUA);

    assert.equal(outcome.ok, true);
    assert.equal(match.player.hand.length, 1);
    assert.equal(match.player.hand[0].type, 'agua');
    assert.equal(match.player.graveyard.length, 0);
});

test('GameMatch.useEssencePower ejecuta SOMBRA (Robar) vía EssencePowerService', () => {
    const match = makeMatch();
    match.startPlayerTurn();
    match.player.essences.activate(CARD_TYPES.SOMBRA);
    giveGems(match.player, CARD_TYPES.SOMBRA, 2);
    match.opponent.hand.push(
        { id: 'fuego-1', type: 'fuego', level: 1, instanceId: 'h1' },
        { id: 'agua-3', type: 'agua', level: 3, instanceId: 'h2' }
    );

    const outcome = match.useEssencePower(CARD_TYPES.SOMBRA);

    assert.equal(outcome.ok, true);
    assert.equal(match.opponent.hand.length, 1);
    assert.equal(match.opponent.graveyard.length, 4);
    assert.equal(match.player.gems.count(CARD_TYPES.SOMBRA), 0);
});

test('GameMatch usa el TurnManager inyectado en lugar de crearlo', () => {
    const fakeTurn = {
        state: 'player-turn',
        resets: 0,
        reset() {
            this.resets++;
        }
    };

    const match = new GameMatch({
        config: GAME_CONFIG,
        turn: fakeTurn
    });

    assert.equal(match.turn, fakeTurn);

    match.reset();

    assert.equal(fakeTurn.resets, 1);
});