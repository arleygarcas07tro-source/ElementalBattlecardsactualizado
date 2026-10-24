import { CardDefinitions } from '../game_objects/card-definitions.js';
import { newId } from '../utils/idGenerator.js';
import CardHealthService from './CardHealthService.js';

/**
 * Entidad de carta del dominio: representa una instancia concreta de carta
 * (datos de definición + `instanceId` único + `owner` opcional).
 *
 * Responsabilidad agregada: centralizar la creación y evolución de instancias
 * de carta sin depender de Phaser (la representación visual vive en
 * `game_objects/card.js`). Evita duplicar en varios sitios la lógica de
 * asignar `instanceId` y buscar la definición de una fusión.
 */
export default class CardEntity {
    /**
     * Crea una instancia de carta a partir de una definición.
     * @param {object} definition Definición base (p. ej. de CardDefinitions).
     * @param {object} [opts]
     * @param {string|null} [opts.owner] Propietario opcional.
     * @param {boolean} [opts.forceNewId=false] Fuerza un `instanceId` nuevo.
     * @returns {object|null} La instancia de carta o null si no hay definición.
     */
    static create(definition, { owner = null, forceNewId = false } = {}) {
        if (!definition) return null;
        const instanceId = (!forceNewId && definition.instanceId) ? definition.instanceId : newId();
        const entity = { ...definition, instanceId, health: CardHealthService.current(definition) };
        if (owner) entity.owner = owner;
        return entity;
    }

    /**
     * Garantiza que una carta robada tenga `instanceId` (mutación en el sitio).
     * @param {object} cardData
     * @returns {object|null} La misma carta con `instanceId`.
     */
    static ensureInstance(cardData) {
        if (!cardData) return cardData;
        if (!cardData.instanceId) cardData.instanceId = newId();
        CardHealthService.ensure(cardData);
        return cardData;
    }

    /**
     * Crea la instancia resultante de fusionar material de nivel N en N+1.
     * @param {{type: string, level: number}} baseCard Carta de nivel base.
     * @returns {object|null} La nueva instancia fusionada o null si no existe.
     */
    static fused(baseCard, secondCard = null) {
        if (!baseCard) return null;
        const newLevel = baseCard.level + 1;
        const definition = CardDefinitions[`${baseCard.type}-${newLevel}`];
        if (!definition) {
            console.error(`[CardEntity] No se encontró la definición para la carta fusionada: ${baseCard.type}-${newLevel}`);
            return null;
        }
        const fusedCard = CardEntity.create(definition);
        fusedCard.health = secondCard
            ? CardHealthService.fusionHealth(baseCard, secondCard)
            : CardHealthService.current(baseCard);
        return fusedCard;
    }

    /**
     * Indica si dos cartas pueden fusionarse (mismo tipo, mismo nivel, < 3).
     * @param {object} a
     * @param {object} b
     * @returns {boolean}
     */
    static areFusionable(a, b) {
        return !!a && !!b && a.type === b.type && a.level === b.level && a.level < 3;
    }
}