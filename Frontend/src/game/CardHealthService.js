/**
 * Reglas de vida de las cartas. Mantiene porcentajes enteros entre 0 y 100
 * sin dependencias de presentación.
 */
export default class CardHealthService {
    static current(card) {
        const health = Number(card?.health);
        return Number.isFinite(health) ? Math.max(0, Math.min(100, Math.round(health))) : 100;
    }

    static ensure(card) {
        if (!card) return 100;
        card.health = this.current(card);
        return card.health;
    }

    static applyDamage(card, damage) {
        const amount = Number(damage);
        if (!card || !Number.isFinite(amount) || amount <= 0) {
            return { health: this.current(card), destroyed: false };
        }
        card.health = Math.max(0, this.current(card) - Math.round(amount));
        return { health: card.health, destroyed: card.health === 0 };
    }

    static fusionHealth(firstCard, secondCard) {
        return Math.min(100, this.current(firstCard) + this.current(secondCard));
    }
}
