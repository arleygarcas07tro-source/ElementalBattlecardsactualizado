/**
 * Servicio puro de destrucción de cartas. Centraliza la lógica de dominio de
 * qué cartas retornan al cementerio según el nivel de la carta destruida.
 * Sin dependencias de Phaser ni de la escena. Única fuente de verdad para la
 * descomposición por nivel (Player.addCardDataToGraveyard delega aquí).
 */
export default class CardDestructionService {
    /**
     * Calcula las entradas de cementerio para una carta destruida.
     * - Nivel 1: se descompone en 1 carta base.
     * - Nivel 2: se descompone en 2 cartas base (1-1) de su tipo.
     * - Nivel 3: se descompone en 4 cartas base (1-1) de su tipo.
     * @param {object} cardData Carta destruida.
     * @returns {object[]} Lista de cartas base (nivel 1) que van al cementerio.
     */
    static graveyardEntries(cardData) {
        const baseCardsCount = cardData.level >= 3 ? 4 : cardData.level === 2 ? 2 : 1;
        return Array.from({ length: baseCardsCount }, () => ({
            id: `${cardData.type}-1`,
            type: cardData.type,
            level: 1
        }));
    }
}