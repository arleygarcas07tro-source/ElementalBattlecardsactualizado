/**
 * Calcula las posiciones X para una fila de elementos centrados horizontalmente.
 * @param {object} config - Objeto de configuración.
 * @param {number} config.numItems - Número de elementos en la fila.
 * @param {number} config.itemWidth - Ancho de cada elemento.
 * @param {number} config.itemSpacing - Espacio entre elementos.
 * @param {number} config.containerWidth - Ancho total del contenedor (la pantalla del juego).
 * @param {number} [config.centerX] - Centro horizontal opcional del contenedor.
 * @returns {number[]} Un array con las coordenadas X de cada elemento.
 */
export function calculateRowPositions({ numItems, itemWidth, itemSpacing, containerWidth, centerX = containerWidth / 2 }) {
    const totalRowWidth = (numItems * itemWidth) + ((numItems - 1) * itemSpacing);
    const startX = centerX - (totalRowWidth / 2) + (itemWidth / 2);
    
    const positions = [];
    for (let i = 0; i < numItems; i++) {
        positions.push(startX + i * (itemWidth + itemSpacing));
    }
    return positions;
}