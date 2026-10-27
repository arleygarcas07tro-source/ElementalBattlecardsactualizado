import { assertContract } from '../../core/assertContract.js';

const METHODS = [
    'onGameEvent',
    'onTurnChanged',
    'onGameStart',
    'offGameStart',
    'emitGameEvent',
    'emitEndTurn',
    'startGame'
];

/**
 * Contrato del gateway de sincronización de red. La escena y el
 * LANEventRouter dependen de esta abstracción, no de una implementación
 * concreta (socket.io, WebSocket, etc.).
 */
export default class ISyncGateway {
    static get METHODS() {
        return METHODS;
    }

    /**
     * @param {object} implementation
     */
    static assert(implementation) {
        assertContract(implementation, METHODS, 'ISyncGateway');
    }
}