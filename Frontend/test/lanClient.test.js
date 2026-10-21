import { test } from 'node:test';
import assert from 'node:assert/strict';

import LANClient from '../src/game/LANClient.js';

function makeSocket() {
    const handlers = {};
    const emitted = [];
    return {
        handlers,
        emitted,
        on(event, handler) { handlers[event] = handler; },
        emit(event, payload) { emitted.push([event, payload]); }
    };
}

test('LANClient: registra handlers de game_event y turn_changed', () => {
    const socket = makeSocket();
    const client = new LANClient(socket, 'guest');

    const onGame = () => {};
    const onTurn = () => {};
    client.onGameEvent(onGame);
    client.onTurnChanged(onTurn);

    assert.equal(socket.handlers.game_event, onGame);
    assert.equal(socket.handlers.turn_changed, onTurn);
});

test('LANClient: emitGameEvent adjunta actor y playerRole', () => {
    const socket = makeSocket();
    const client = new LANClient(socket, 'guest');

    const ok = client.emitGameEvent({ type: 'play_card' });

    assert.equal(ok, true);
    assert.deepEqual(socket.emitted[0], ['game_event', { actor: 'player', playerRole: 'guest', type: 'play_card' }]);
});

test('LANClient: emitEndTurn notifica al servidor con el rol', () => {
    const socket = makeSocket();
    const client = new LANClient(socket, 'host');

    assert.equal(client.emitEndTurn(), true);
    assert.deepEqual(socket.emitted[0], ['end_turn', { playerRole: 'host' }]);
});

test('LANClient: sin socket no emite eventos', () => {
    const client = new LANClient(null, 'host');

    assert.equal(client.emitGameEvent({ type: 'attack' }), false);
    assert.equal(client.emitEndTurn(), false);
});

test('LANClient: sin rol explícito playerRole queda null', () => {
    const socket = makeSocket();
    const client = new LANClient(socket);

    assert.equal(client.playerRole, null);
    client.emitEndTurn();
    assert.deepEqual(socket.emitted[0], ['end_turn', { playerRole: null }]);
});

test('LANClient: si el socket lanza al emitir, devuelve false sin propagar', () => {
    const socket = {
        on() {},
        emit() { throw new Error('boom'); }
    };
    const client = new LANClient(socket, 'host');

    assert.equal(client.emitGameEvent({ type: 'attack' }), false);
    assert.equal(client.emitEndTurn(), false);
});
