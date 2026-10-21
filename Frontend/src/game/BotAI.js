import { resolveCombat } from '../helpers/combat.js';
import { getBaseCardTypes } from '../game_objects/card-definitions.js';

const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Decide las acciones del oponente (bot) según su nivel de dificultad.
 * Clase de lógica pura: recibe datos del modelo (campo/mano/cartas) y
 * devuelve un plan de acción ({ kind: 'fusion' | 'directAttack' | 'attack'
 * | 'playCard' | 'pass' }). No depende de Phaser ni de la escena.
 */
export default class BotAI {
    /**
     * @param {number} [difficulty=3] Nivel de dificultad (1-10).
     */
    constructor(difficulty = 3) {
        this.gemFocus = false;
        this.setDifficulty(difficulty);
    }

    /**
     * Activa/desactiva el foco en recolectar gemas (modos con gemas): el bot
     * siempre intenta fusionar y prioriza las fusiones hacia nivel 3.
     * @param {boolean} enabled
     */
    setGemFocus(enabled) {
        this.gemFocus = !!enabled;
    }

    /**
     * Cambia el nivel de dificultad del bot.
     * @param {number} difficulty Nivel 1-10.
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this._delay = this.computeActionDelay();
        this._scoreModifier = this.computeScoreModifier();
    }

    /**
     * Probabilidad/regla de si el bot intenta fusionar según la dificultad.
     * @returns {boolean}
     */
    shouldAttemptFusion() {
        switch (this.difficulty) {
            case 1:
                return false;
            case 2:
                return Math.random() < 0.2;
            case 3:
                return Math.random() < 0.4;
            case 4:
                return Math.random() < 0.8;
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
                return true;
            default:
                return Math.random() < 0.4;
        }
    }

    /**
     * Threshold de puntuación para atacar según la dificultad.
     * @returns {number}
     */
    getAttackThreshold() {
        switch (this.difficulty) {
            case 6: return -1;
            case 7: return -2;
            case 8: return -3;
            case 9: return -5;
            case 10: return -10;
            case 1: return 10;
            case 2: return 7;
            case 3: return 5;
            case 4: return 3;
            case 5: return 0;
            default: return 5;
        }
    }

    /**
     * Delay (ms) de reacción antes de ejecutar la acción.
     * Se fija al cambiar la dificultad para mantener estabilidad durante la partida.
     * @returns {number}
     */
    computeActionDelay() {
        switch (this.difficulty) {
            case 6: return between(200, 400);
            case 7: return between(150, 300);
            case 8: return between(100, 200);
            case 9: return 50;
            case 10: return 0;
            case 1: return between(1500, 2500);
            case 2: return between(1000, 1800);
            case 3: return 800;
            case 4: return between(400, 700);
            case 5: return 300;
            default: return 800;
        }
    }

    /**
     * Modificador de puntuación de ataque según la dificultad.
     * @returns {number}
     */
    computeScoreModifier() {
        switch (this.difficulty) {
            case 6: return between(1, 3);
            case 7: return between(2, 5);
            case 8: return between(3, 7);
            case 9: return between(5, 10);
            case 10: return 10;
            case 1: return between(-15, -5);
            case 2: return between(-3, 0);
            case 3: return 0;
            case 4: return between(0, 2);
            case 5: return 0;
            default: return 0;
        }
    }

    get actionDelay() {
        return this._delay;
    }

    get scoreModifier() {
        return this._scoreModifier;
    }

    /**
     * Realeatoriza el delay de reacción (el bot "recalcula" su ritmo cada turno).
     */
    refreshActionDelay() {
        this._delay = this.computeActionDelay();
    }

    /**
     * Realeatoriza el modificador de puntuación (el bot "recalcula" su precisión cada turno).
     */
    refreshScoreModifier() {
        this._scoreModifier = this.computeScoreModifier();
    }

    /**
     * Encuentra el mejor ataque según puntuación.
     * @param {{card: object, index: number}[]} opponentAttackers Atacantes disponibles del oponente.
     * @param {{card: object, index: number}[]} revealedDefenders Defensores revelados del jugador.
     * @returns {{attacker: object, defender: object, score: number}|null}
     */
    findBestAttack(opponentAttackers, revealedDefenders) {
        if (opponentAttackers.length === 0 || revealedDefenders.length === 0) {
            return null;
        }

        let bestAttack = { score: -100 };
        for (const attacker of opponentAttackers) {
            for (const defender of revealedDefenders) {
                let currentScore = 0;
                const result = resolveCombat(attacker.card, defender.card);

                if (result.winner === 'attacker') {
                    currentScore += 10 + defender.card.level * 2;
                } else {
                    currentScore -= 10;
                    if (result.loser === 'attacker') currentScore -= attacker.card.level * 3;
                }

                currentScore += this.scoreModifier;

                if (currentScore > bestAttack.score) {
                    bestAttack = { attacker, defender, score: currentScore };
                }
            }
        }

        return bestAttack.score > 0 ? bestAttack : null;
    }

    /**
     * Busca la mejor fusión de campo posible (dos cartas iguales de nivel < 3).
     * @param {import('../game_objects/player.js').default} opponentFieldModel Esperado: el Battlefield del oponente.
     * @param {object[]} opponentHand La mano del oponente.
     * @returns {{indices: number[]}|null}
     */
    findBestFusion(opponentField, opponentHand) {
        const samePairs = [];
        for (let i = 0; i < opponentField.size; i++) {
            for (let j = i + 1; j < opponentField.size; j++) {
                const a = opponentField.get(i), b = opponentField.get(j);
                if (a && b && a.type === b.type && a.level === b.level && a.level < 3) {
                    samePairs.push({ i, j, level: a.level, type: a.type });
                }
            }
        }

        const currentTypes = opponentField.types();
        const needed = getBaseCardTypes().filter(t => !currentTypes.has(t));

        if (samePairs.length > 0 && (needed.length > 0 || opponentHand.length === 0 || this.gemFocus)) {
            // En modo gemas priorizamos nivel 2 -> 3 (la gema nace del nivel 3).
            samePairs.sort((a, b) => this.gemFocus ? (b.level - a.level) : (a.level - b.level));
            return { indices: [samePairs[0].i, samePairs[0].j] };
        }

        return null;
    }

    /**
     * Decide la acción del oponente para este turno.
     * @param {{
     *   opponent: object,
     *   mustAttack: boolean,
     *   playerHasField: boolean,
     *   opponentAttackers: {card: object, index: number}[],
     *   bestAttackPool: {card: object, index: number}[],
     *   revealedDefenders: {card: object, index: number}[],
     *   playerFieldCards: {card: object, index: number}[]
     * }} opts
     * @returns {object} Plan de acción con un `kind` y datos del objetivo.
     */
    decideAction(opts) {
        const { opponent, mustAttack, playerHasField, opponentAttackers, bestAttackPool, revealedDefenders, playerFieldCards } = opts;

        // 1) Intento de fusión de campo (nunca si está obligado a atacar).
        if (!mustAttack && (this.gemFocus || this.shouldAttemptFusion())) {
            const fusion = this.findBestFusion(opponent.field, opponent.hand);
            if (fusion) {
                return { kind: 'fusion', indices: fusion.indices };
            }
        }

        const bestAttack = this.findBestAttack(bestAttackPool, revealedDefenders);

        // 2) Obligado a atacar y sin defensas -> ataque directo por esencias.
        if (mustAttack && opponentAttackers.length > 0 && !playerHasField) {
            return { kind: 'directAttack', attackerIndex: randPick(opponentAttackers).index };
        }

        // 3) Obligado a atacar con mejor ataque calculado.
        if (mustAttack && bestAttack) {
            return { kind: 'attack', attackerIndex: bestAttack.attacker.index, defenderIndex: bestAttack.defender.index };
        }

        // 4) Ataque opcional según threshold de dificultad.
        if (!mustAttack && bestAttack && bestAttack.score >= this.getAttackThreshold()) {
            return { kind: 'attack', attackerIndex: bestAttack.attacker.index, defenderIndex: bestAttack.defender.index };
        }

        // 5) Obligado a atacar sin opciones calculadas -> ataque aleatorio forzado.
        if (mustAttack && opponentAttackers.length > 0) {
            if (playerFieldCards.length === 0) {
                return { kind: 'directAttack', attackerIndex: randPick(opponentAttackers).index };
            }
            const attacker = randPick(opponentAttackers);
            const defender = randPick(playerFieldCards);
            return { kind: 'attack', attackerIndex: attacker.index, defenderIndex: defender.index };
        }

        // 6) Jugar carta que cubra tipos faltantes o simplemente ocupar.
        if (!mustAttack) {
            const emptySlots = opponent.field.emptyIndices();
            if (emptySlots.length > 0 && opponent.hand.length > 0) {
                const types = opponent.field.types();
                const missingTypes = getBaseCardTypes().filter(t => !types.has(t));
                let pickIdx = null;
                if (missingTypes.length > 0) {
                    const candidate = opponent.hand.find(c => missingTypes.includes(c.type));
                    if (candidate) pickIdx = opponent.hand.indexOf(candidate);
                }
                if (pickIdx === null) pickIdx = 0;
                return { kind: 'playCard', handIndex: pickIdx, slotIndex: randPick(emptySlots) };
            }
        }

        // 7) Sin acción posible.
        return { kind: 'pass' };
    }
}