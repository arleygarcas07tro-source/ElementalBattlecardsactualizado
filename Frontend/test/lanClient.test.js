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
        off(event, handler) {
            if (handlers[event] === handler) delete handlers[event];
        },
        emit(event, payload, callback) {
            emitted.push(callback ? [event, payload, callback] : [event, payload]);
        }
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

test('LANClient: registra y elimina el handler de game_start', () => {
    const socket = makeSocket();
    const client = new LANClient(socket, 'host');

    const onStart = () => {};
    client.onGameStart(onStart);

    assert.equal(socket.handlers.game_start, onStart);

    client.offGameStart(onStart);
    assert.equal(socket.handlers.game_start, undefined);
});

test('LANClient: startGame solo lo solicita el host', () => {
    const socket = makeSocket();
    const client = new LANClient(socket, 'host');
    let response = null;

    assert.equal(client.startGame((r) => { response = r; }), true);
    assert.equal(socket.emitted[0][0], 'start_game');
    assert.deepEqual(socket.emitted[0][1], {});
    assert.equal(response, null);
});

test('LANClient: startGame rechaza al guest sin emitir', () => {
    const socket = makeSocket();
    const client = new LANClient(socket, 'guest');
    let response = null;

    assert.equal(client.startGame((r) => { response = r; }), false);
    assert.equal(socket.emitted.length, 0);
    assert.equal(response.success, false);
    assert.match(response.message, /anfitrión/);
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
    let response = null;

    assert.equal(client.emitGameEvent({ type: 'attack' }), false);
    assert.equal(client.emitEndTurn(), false);
    assert.equal(client.startGame((r) => { response = r; }), false);
    assert.equal(response.success, false);
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
    assert.equal(client.startGame(() => {}), false);
});
