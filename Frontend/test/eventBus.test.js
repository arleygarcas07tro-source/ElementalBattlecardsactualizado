import { test } from 'node:test';
import assert from 'node:assert/strict';

import EventBus from '../src/utils/eventBus.js';

test('EventBus: emite a los suscriptores con argumentos', () => {
    const bus = new EventBus();
    const received = [];
    bus.on('foo', (a, b) => received.push([a, b]));

    const hadListeners = bus.emit('foo', 1, 2);

    assert.equal(hadListeners, true);
    assert.deepEqual(received, [[1, 2]]);
});

test('EventBus: emit sin listeners devuelve false', () => {
    const bus = new EventBus();
    assert.equal(bus.emit('nadie'), false);
});

test('EventBus: on devuelve función de desuscripción', () => {
    const bus = new EventBus();
    let calls = 0;
    const unsubscribe = bus.on('foo', () => { calls++; });

    bus.emit('foo');
    unsubscribe();
    bus.emit('foo');

    assert.equal(calls, 1);
});

test('EventBus: off elimina un manejador concreto', () => {
    const bus = new EventBus();
    let a = 0;
    let b = 0;
    const handlerA = () => { a++; };
    const handlerB = () => { b++; };
    bus.on('foo', handlerA);
    bus.on('foo', handlerB);

    bus.off('foo', handlerA);
    bus.emit('foo');

    assert.equal(a, 0);
    assert.equal(b, 1);
});

test('EventBus: removeAllListeners limpia todo', () => {
    const bus = new EventBus();
    let calls = 0;
    bus.on('foo', () => { calls++; });
    bus.removeAllListeners();

    assert.equal(bus.emit('foo'), false);
    assert.equal(calls, 0);
});

test('EventBus: un listener con error no impide a los demás', () => {
    const bus = new EventBus();
    let called = false;
    bus.on('foo', () => { throw new Error('boom'); });
    bus.on('foo', () => { called = true; });

    assert.equal(bus.emit('foo'), true);
    assert.equal(called, true);
});

test('EventBus: no duplica el mismo handler', () => {
    const bus = new EventBus();
    let calls = 0;
    const handler = () => { calls++; };
    bus.on('foo', handler);
    bus.on('foo', handler);

    bus.emit('foo');

    assert.equal(calls, 1);
});