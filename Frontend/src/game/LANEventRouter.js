import CardHealthService from './CardHealthService.js';

const INVERTED_REASONS = Object.freeze({
    playerInactive: 'opponentInactive',
    opponentInactive: 'playerInactive',
    playerEssences: 'opponentEssences',
    opponentEssences: 'playerEssences',
    playerObjectives: 'opponentObjectives',
    opponentObjectives: 'playerObjectives',
    playerFieldControl: 'opponentFieldControl',
    opponentFieldControl: 'playerFieldControl',
    playerTurnLimit: 'opponentTurnLimit',
    opponentTurnLimit: 'playerTurnLimit'
});

/**
 * Traductor de eventos remotos LAN a comandos de dominio (GameMatch).
 *
 * Responsabilidad: filtrar ecos del propio emisor, decidir el jugador objetivo,
 * aplicar las mutaciones de modelo que un evento remoto implica y devolver
 * "efectos" descriptivos (datos) para que la capa de presentación ejecute las
 * animaciones. No conoce Phaser ni la escena.
 */
export default class LANEventRouter {
    /**
     * @param {object} deps
     * @param {import('./GameMatch.js').default} deps.match Motor de partida.
     * @param {string|null} [deps.playerRole] Rol local ('host' | 'guest').
     * @param {boolean} [deps.debug=false] Logs de sincronización.
     */
    constructor({ match, playerRole = null, debug = false }) {
        this.match = match;
        this.playerRole = playerRole || null;
        this.debug = debug;
    }

    /**
     * Procesa un payload remoto.
     * @param {object} payload
     * @returns {{isRemotePlayer: boolean, effects: object[]}|null} null si se ignora.
     */
    route(payload) {
        if (!payload || !payload.type) return null;

        // Eco del propio emisor (el servidor reenvía a todos): ignorar.
        if (payload.playerRole && payload.playerRole === this.playerRole) {
            console.log('[LANEventRouter] Ignorando evento propio eco del servidor:', payload.type);
            return null;
        }

        const isRemotePlayer = payload.playerRole
            ? payload.playerRole !== this.playerRole
            : payload.actor === 'player';

        const isOpponentAction = isRemotePlayer && this.match.turn.state === 'opponent-turn';
        console.log('[LANEventRouter] Evento remoto recibido', { type: payload.type, isRemotePlayer, myRole: this.playerRole });

        const effect = this._routeByType(payload, isRemotePlayer, isOpponentAction);
        if (!effect) {
            console.log('Evento remoto no manejado:', payload.type);
            return null;
        }
        return { isRemotePlayer, effects: [effect] };
    }

    /**
     * @param {object} payload
     * @param {boolean} isRemotePlayer
     * @param {boolean} isOpponentAction
     * @returns {object|null} Efecto descriptivo para la presentación.
     */
    _routeByType(payload, isRemotePlayer, isOpponentAction) {
        switch (payload.type) {
            case 'play_card': return this._routePlayCard(payload, isRemotePlayer, isOpponentAction);
            case 'fuse_cards': return this._routeFuseCards(payload, isRemotePlayer, isOpponentAction);
            case 'fuse_from_hand': return this._routeFuseFromHand(payload, isRemotePlayer, isOpponentAction);
            case 'attack': return this._routeAttack(payload, isRemotePlayer, isOpponentAction);
            case 'direct_attack': return this._routeDirectAttack(payload, isRemotePlayer, isOpponentAction);
            case 'game_over': return this._routeGameOver(payload);
            default: return null;
        }
    }

    /**
     * Modelo del jugador objetivo según si el actor es remoto.
     * @param {boolean} isRemotePlayer
     */
    _targetModel(isRemotePlayer) {
        return isRemotePlayer ? this.match.opponent : this.match.player;
    }

    _routePlayCard(payload, isRemotePlayer, isOpponentAction) {
        const card = payload.card;
        const fieldIndex = payload.fieldIndex;
        try {
            this._targetModel(isRemotePlayer).field.set(fieldIndex, card);
            this._targetModel(isRemotePlayer).registerGem(card);
            if (this.debug) console.log('[LANEventRouter][debug] play_card: modelo actualizado', { fieldIndex, instanceId: card && card.instanceId });
        } catch (e) {
            console.warn('No se pudo actualizar el modelo remoto:', e);
        }
        if (isOpponentAction) this.match.turn.consumeOpponentAction();
        return { kind: 'play-card', isRemotePlayer, fieldIndex, card, actor: payload.actor, playerRole: payload.playerRole };
    }

    _routeFuseCards(payload, isRemotePlayer, isOpponentAction) {
        const { sourceIndex, targetIndex, resultCard } = payload;
        const model = this._targetModel(isRemotePlayer);
        model.field.clearAt(sourceIndex);
        model.field.set(targetIndex, resultCard);
        model.registerGem(resultCard);
        if (this.debug) console.log('[LANEventRouter][debug] fuse_cards: modelo actualizado', { sourceIndex, targetIndex, instanceId: resultCard && resultCard.instanceId });
        if (isOpponentAction) this.match.turn.consumeOpponentAction();
        return { kind: 'fuse-cards', isRemotePlayer, sourceIndex, targetIndex, resultCard };
    }

    _routeFuseFromHand(payload, isRemotePlayer, isOpponentAction) {
        const { targetIndex, resultCard } = payload;
        const model = this._targetModel(isRemotePlayer);
        model.field.set(targetIndex, resultCard);
        model.registerGem(resultCard);
        if (this.debug) console.log('[LANEventRouter][debug] fuse_from_hand: modelo actualizado', { targetIndex, instanceId: resultCard && resultCard.instanceId });
        if (isOpponentAction) this.match.turn.consumeOpponentAction();
        return { kind: 'fuse-from-hand', isRemotePlayer, targetIndex, resultCard };
    }

    _routeAttack(payload, isRemotePlayer, isOpponentAction) {
        const { attackerIndex, defenderIndex, result } = payload;
        const defender = (isRemotePlayer ? this.match.player : this.match.opponent).field.get(defenderIndex);
        const health = CardHealthService.applyDamage(defender, result && result.damage);
        if (isOpponentAction) {
            this.match.turn.consumeOpponentAction();
            this.match.turn.opponentPerformedAttackThisTurn = true;
        }
        return {
            kind: 'attack',
            attackerIndex,
            defenderIndex,
            result: result ? { ...result, defenderHealth: health.health, destroyed: health.destroyed } : result
        };
    }

    _routeDirectAttack(payload, isRemotePlayer, isOpponentAction) {
        return {
            kind: 'direct-attack',
            isRemotePlayer,
            attackerIndex: payload.attackerIndex,
            essenceType: payload.essenceType,
            isOpponentAction
        };
    }

    _routeGameOver(payload) {
        const winner = payload.winner === 'player'
            ? 'opponent'
            : payload.winner === 'opponent'
                ? 'player'
                : null;
        const reason = payload.reason
            ? (INVERTED_REASONS[payload.reason] || payload.reason)
            : null;
        return { kind: 'game-over', winner, reason };
    }
}