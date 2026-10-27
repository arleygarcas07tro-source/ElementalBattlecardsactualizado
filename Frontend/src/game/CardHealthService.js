const MAX_HEALTH_BY_LEVEL = Object.freeze({
    1: 100,
    2: 150,
    3: 200
});

/**
 * Reglas de vida de las cartas. La vida real (puntos) escala con el nivel y la
 * presentación consume el porcentaje resultante (0-100).
 */
export default class CardHealthService {
    static get MAX_HEALTH_BY_LEVEL() {
        return MAX_HEALTH_BY_LEVEL;
    }

    static maxForLevel(level) {
        const normalized = Math.max(1, Math.min(3, Math.floor(Number(level) || 1)));
        return MAX_HEALTH_BY_LEVEL[normalized];
    }

    static maxFor(card) {
        const declared = Number(card?.maxHealth);
        if (Number.isFinite(declared) && declared > 0) return Math.round(declared);
        return this.maxForLevel(card?.level);
    }

    static current(card) {
        const maxHealth = this.maxFor(card);
        const health = Number(card?.health);
        return Number.isFinite(health)
            ? Math.max(0, Math.min(maxHealth, Math.round(health)))
            : maxHealth;
    }

    static percent(card) {
        const maxHealth = this.maxFor(card);
        if (maxHealth <= 0) return 0;
        return Math.max(0, Math.min(100, Math.round(this.current(card) / maxHealth * 100)));
    }

    static ensure(card) {
        if (!card) return 100;
        card.maxHealth = this.maxFor(card);
        card.health = this.current(card);
        return card.health;
    }

    static setPercent(card, percent) {
        if (!card) return 0;
        const maxHealth = this.maxFor(card);
        const value = Number(percent);
        card.maxHealth = maxHealth;
        card.health = Number.isFinite(value)
            ? Math.round(maxHealth * Math.max(0, Math.min(100, value)) / 100)
            : maxHealth;
        return card.health;
    }

    static applyDamage(card, damage) {
        const amount = Number(damage);
        if (!card || !Number.isFinite(amount) || amount <= 0) {
            return { health: this.current(card), percent: this.percent(card), destroyed: false, damage: 0 };
        }
        const maxHealth = this.maxFor(card);
        this.ensure(card);
        const points = Math.round(maxHealth * Math.min(100, amount) / 100);
        card.health = Math.max(0, card.health - points);
        return {
            health: card.health,
            percent: this.percent(card),
            destroyed: card.health === 0,
            damage: points
        };
    }

    static fusionHealth(firstCard, secondCard) {
        return Math.min(100, this.percent(firstCard) + this.percent(secondCard));
    }
}
