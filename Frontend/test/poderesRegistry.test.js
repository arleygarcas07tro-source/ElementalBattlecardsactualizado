import { test } from 'node:test';
import assert from 'node:assert/strict';

import Poder from '../src/game/powers/Poder.js';
import PoderesRegistry from '../src/game/powers/PoderesRegistry.js';
import { CARD_TYPES } from '../src/helpers/constants.js';

function validCtx() {
    return {
        player: { 
            essences: { has: () => true }, 
            graveyard: [], 
            hand: [],
            drawCard() {},
            gems: { count: () => 3 }
        },
        opponent: { hand: [], addCardDataToGraveyard() {}, id: 'opponent' },
        turn: { 
            state: 'player-turn',
            getPowerUses: () => 0,
            playerPowerUses: {},
            opponentConvergenceBlocked: false 
        },
        emitConvergenceStatus() {}
    };
}

test('PoderesRegistry registra exactamente los 6 elementos actuales', () => {
    assert.equal(PoderesRegistry.all.length, 6);
    Object.values(CARD_TYPES).forEach((type) => {
        assert.ok(PoderesRegistry.get(type), `falta el poder de ${type}`);
    });
});

test('PoderesRegistry.get devuelve null para un tipo desconocido', () => {
    assert.equal(PoderesRegistry.get('cristal'), null);
});

test('Poder.canUse valida con las reglas de EssencePowerService', () => {
    const poder = PoderesRegistry.get(CARD_TYPES.FUEGO);

    const plan = poder.canUse(validCtx());

    assert.equal(plan.ok, true);
    assert.equal(plan.name, 'Ráfaga');
});

test('OCP: un poder nuevo se agrega como clase extendiendo Poder, sin tocar GameMatch', () => {
    class Cristalizar extends Poder {
        execute(ctx) {
            ctx.turn.cristalizado = true;
            return ['cristal'];
        }
    }
    const poder = new Cristalizar(CARD_TYPES.FUEGO);
    const ctx = validCtx();
    // Cristalizar usará validación de FUEGO (1 gema) con contexto válido
    ctx.player.gems.count = () => 1;

    assert.deepEqual(poder.execute(ctx), ['cristal']);
    assert.equal(ctx.turn.cristalizado, true);
    assert.equal(poder.canUse(ctx).ok, true);
});

test('LSP: los 6 poderes son sustituibles bajo el mismo contrato de execute', () => {
    const ctx = validCtx();
    // Material de dominio mínimo para que el contexto común satisfaga las
    // precondiciones de AGUA (cementerio) y SOMBRA (mano del rival).
    ctx.player.hand = [];
    ctx.player.graveyard.push({ id: 'agua-1', type: 'agua', level: 1 });
    ctx.opponent.hand.push({ id: 'fuego-2', type: 'fuego', level: 2 });

    for (const poder of PoderesRegistry.all) {
        assert.ok(poder instanceof Poder, `${poder.type} no se comporta como Poder`);

        const plan = poder.canUse(ctx);
        assert.ok(plan && plan.ok, `${poder.type}: canUse fallo (${plan && plan.reason})`);

        let changed;
        assert.doesNotThrow(() => { changed = poder.execute(ctx); }, `${poder.type}: execute lanzo una excepcion`);
        assert.ok(Array.isArray(changed), `${poder.type}: execute no devuelve un array`);
    }
});