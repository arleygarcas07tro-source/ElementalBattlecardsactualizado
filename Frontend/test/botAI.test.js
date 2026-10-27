import { test } from 'node:test';
import assert from 'node:assert/strict';

import BotAI from '../src/game/BotAI.js';
import GameMatch from '../src/game/GameMatch.js';
import { GAME_CONFIG, CARD_TYPES } from '../src/helpers/constants.js';

test('BotAI: dificultad por defecto 3 y threshold 5', () => {
    const bot = new BotAI();

    assert.equal(bot.difficulty, 3);
    assert.equal(bot.getAttackThreshold(), 5);
    assert.equal(bot.actionDelay, 300);
    assert.equal(GAME_CONFIG.BOT_NEXT_ACTION_DELAY_MS, 250);
});

test('BotAI: mantiene una breve pausa acorde a la dificultad', () => {
    const easyBot = new BotAI(1);
    const standardBot = new BotAI(4);
    const hardBot = new BotAI(8);

    assert.ok(easyBot.actionDelay >= 800 && easyBot.actionDelay <= 1400);
    assert.ok(standardBot.actionDelay >= 250 && standardBot.actionDelay <= 400);
    assert.ok(hardBot.actionDelay >= 80 && hardBot.actionDelay <= 140);
});

test('BotAI: dificultad máxima sin delay y con bonus de puntuación', () => {
    const bot = new BotAI(10);

    assert.equal(bot.actionDelay, 0);
    assert.equal(bot.scoreModifier, 10);
    assert.equal(bot.getAttackThreshold(), -10);
});

test('BotAI: setDifficulty recalcula delay y modificador', () => {
    const bot = new BotAI(1);
    const before = bot.actionDelay;

    bot.setDifficulty(5);

    assert.equal(bot.scoreModifier, 0);
    assert.equal(bot.getAttackThreshold(), 0);
    assert.equal(typeof before, 'number');
});

test('BotAI: findBestAttack elige el ataque ganador', () => {
    const bot = new BotAI(3);

    const best = bot.findBestAttack(
        [{ card: { type: CARD_TYPES.FUEGO, level: 1 }, index: 0 }],
        [{ card: { type: CARD_TYPES.PLANTA, level: 1 }, index: 0 }]
    );

    assert.equal(best.attacker.index, 0);
    assert.equal(best.defender.index, 0);
    assert.ok(best.score > 0);
});

test('BotAI: findBestAttack puede dañar cartas neutrales sin mutar su vida', () => {
    const bot = new BotAI(3);

    const best = bot.findBestAttack(
        [{ card: { type: CARD_TYPES.FUEGO, level: 1 }, index: 0 }],
        [{ card: { type: CARD_TYPES.FUEGO, level: 1 }, index: 0 }]
    );

    assert.equal(best.attacker.index, 0);
    assert.equal(best.defender.index, 0);
    assert.equal(best.score, 5);
    assert.equal(best.defender.card.health, undefined);
});

test('BotAI: decideAction hace pass sin acciones posibles', () => {
    const match = new GameMatch({ config: GAME_CONFIG });
    const opponent = match.opponent;
    opponent.hand = [];
    for (let i = 0; i < opponent.field.size; i++) {
        opponent.field.set(i, { type: CARD_TYPES.FUEGO, level: 1 });
    }

    const plan = new BotAI(1).decideAction({
        opponent,
        mustAttack: false,
        playerHasField: false,
        opponentAttackers: [],
        bestAttackPool: [],
        revealedDefenders: [],
        playerFieldCards: []
    });

    assert.equal(plan.kind, 'pass');
});

test('BotAI: decideAction juega una carta cuando hay hueco y mano', () => {
    const match = new GameMatch({ config: GAME_CONFIG });
    const opponent = match.opponent;
    opponent.hand = [{ id: 'fuego-1', type: CARD_TYPES.FUEGO, level: 1 }];

    const plan = new BotAI(1).decideAction({
        opponent,
        mustAttack: false,
        playerHasField: false,
        opponentAttackers: [],
        bestAttackPool: [],
        revealedDefenders: [],
        playerFieldCards: []
    });

    assert.equal(plan.kind, 'playCard');
    assert.equal(plan.handIndex, 0);
    assert.equal(typeof plan.slotIndex, 'number');
});

test('BotAI: decideAction ataca directo cuando está obligado y no hay defensas', () => {
    const match = new GameMatch({ config: GAME_CONFIG });
    const opponent = match.opponent;

    const plan = new BotAI(1).decideAction({
        opponent,
        mustAttack: true,
        playerHasField: false,
        opponentAttackers: [{ card: { type: CARD_TYPES.FUEGO, level: 1 }, index: 3 }],
        bestAttackPool: [],
        revealedDefenders: [],
        playerFieldCards: []
    });

    assert.equal(plan.kind, 'directAttack');
    assert.equal(plan.attackerIndex, 3);
});

test('BotAI: findBestFusion empareja dos cartas iguales de nivel menor a 3', () => {
    const match = new GameMatch({ config: GAME_CONFIG });
    const opponent = match.opponent;
    opponent.field.set(0, { type: CARD_TYPES.FUEGO, level: 1 });
    opponent.field.set(1, { type: CARD_TYPES.FUEGO, level: 1 });

    const fusion = new BotAI(3).findBestFusion(opponent.field, []);

    assert.deepEqual(fusion.indices, [0, 1]);
});
