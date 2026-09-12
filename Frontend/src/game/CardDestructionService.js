/**
 * Servicio puro de destrucción de cartas. Centraliza la lógica de dominio de
 * qué cartas retornan al cementerio según el nivel de la carta destruida.
 * Sin dependencias de Phaser ni de la escena.
 */
export default class CardDestructionService {
    /**
     * Calcula las entradas de cementerio para una carta destruida.
     * - Nivel 1: la misma carta.
     * - Nivel 2: dos cartas base (1-1) de su tipo.
     * - Nivel 3: cuatro cartas base (1-1) de su tipo.
     * @param {object} cardData Carta destruida.
     * @returns {object[]} Lista de cartas que van al cementerio.
     */
    static graveyardEntries(cardData) {
        if (cardData.level === 2) {
            return [
                { ...cardData, level: 1, id: `${cardData.type}-l1` },
                { ...cardData, level: 1, id: `${cardData.type}-l1-b` }
            ];
        }
        if (cardData.level === 3) {
            return Array.from({ length: 4 }, (_, i) => ({
                ...cardData,
                level: 1,
                id: `${cardData.type}-l1-${i}`
            }));
        }
        return [cardData];
    }
}