import { assertContract } from '../../core/assertContract.js';

const METHODS = ['decideAction', 'refreshActionDelay', 'refreshScoreModifier'];

/**
 * Contrato de la IA del oponente. La escena depende de esta abstracción, no de
 * la implementación concreta (BotAI).
 */
export default class IBotAI {
    static get METHODS() {
        return METHODS;
    }

    /**
     * @param {object} implementation
     */
    static assert(implementation) {
        assertContract(implementation, METHODS, 'IBotAI');
    }
}