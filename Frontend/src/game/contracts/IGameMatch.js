import { assertContract } from '../../core/assertContract.js';

const METHODS = ['startPlayerTurn', 'startOpponentTurn', 'checkVictoryConditions', 'useEssencePower', 'resolvePlayerAttack', 'markPlayerAttackConsumed'];

/**
 * Contrato del motor de partida. La escena depende de esta abstracción para
 * no acoplarse a la implementación concreta (GameMatch).
 */
export default class IGameMatch {
    static get METHODS() {
        return METHODS;
    }

    /**
     * @param {object} implementation
     */
    static assert(implementation) {
        assertContract(implementation, METHODS, 'IGameMatch');
    }
}