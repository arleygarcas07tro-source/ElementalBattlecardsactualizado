import GameMatch from '../game/GameMatch.js';
import TurnManager from '../game/TurnManager.js';
import BotAI from '../game/BotAI.js';
import LANClient from '../game/LANClient.js';
import LANEventRouter from '../game/LANEventRouter.js';
import IGameMatch from '../game/contracts/IGameMatch.js';
import IBotAI from '../game/contracts/IBotAI.js';
import ISyncGateway from '../game/contracts/ISyncGateway.js';

/**
 * Composition root del frontend: único punto donde se construyen y conectan las
 * dependencias de una partida (motor de dominio, IA y pila de red LAN).
 *
 * Responsabilidad agregada: centralizar la creación de dependencias y validar
 * sus contratos (fail-fast) para que las escenas dependan de abstracciones y no
 * conozcan las implementaciones concretas.
 */
export default class GameComposer {
    /**
     * Construye el motor de partida y valida IGameMatch.
     * @param {object} deps
     * @param {object} deps.config Configuración de partida (GAME_CONFIG).
     * @param {Function} [deps.onGemGained] Aviso de gema obtenida:
     *   (ownerId, type, progress).
     * @returns {GameMatch}
     */
    static createMatch({ config, onGemGained = null }) {
        const match = new GameMatch({ config, turn: new TurnManager(config), onGemGained });
        IGameMatch.assert(match);
        return match;
    }

    /**
     * Construye la IA del oponente y valida IBotAI.
     * @param {object} [deps]
     * @param {number} [deps.difficulty=3] Dificultad 1-10.
     * @returns {BotAI}
     */
    static createBot({ difficulty = 3 } = {}) {
        const bot = new BotAI(difficulty);
        IBotAI.assert(bot);
        return bot;
    }

    /**
     * Construye la pila LAN (cliente de sync + router de eventos) y valida
     * ISyncGateway sobre el cliente.
     * @param {object} deps
     * @param {object} deps.socket Socket de socket.io.
     * @param {string|null} deps.playerRole Rol local ('host' | 'guest').
     * @param {object} deps.match Motor de partida ya construido.
     * @param {boolean} [deps.debug=false] Logs de sincronización.
     * @returns {{client: LANClient, router: LANEventRouter}}
     */
    static createLanStack({ socket, playerRole, match, debug = false }) {
        const client = new LANClient(socket, playerRole);
        ISyncGateway.assert(client);
        const router = new LANEventRouter({ match, playerRole, debug });
        return { client, router };
    }
}