/**
 * Contenido estático de la sección "Acerca de" (capa de datos de presentación).
 * Las escenas solo lo renderizan.
 */

export const ABOUT_SECTIONS = [
    {
        id: 'juego',
        icon: '🎮',
        title: 'El juego',
        body: `
            <p>Elemental Battlecards es un juego de cartas estratégico digital inspirado en la
            <strong>Teoría de Conjuntos</strong>, donde cada mecánica del sistema corresponde a una operación
            matemática formal.</p>
            <p>El objetivo del jugador es vencer al oponente mediante combate, o completar el conjunto total
            de <strong>esencias</strong> y <strong>elementos activos</strong> en el campo de batalla.</p>
        `
    },
    {
        id: 'principios',
        icon: '🔢',
        title: 'Principios matemáticos',
        body: `
            <ul class="formulas">
                <li>
                    <span class="formula">A ∪ B ∪ C</span>
                    <span class="formula-desc"><strong>Unión:</strong> obtener los 6 tipos elementales en tu campo o la colección completa de las 6 esencias.</span>
                </li>
                <li>
                    <span class="formula">A ∩ A</span>
                    <span class="formula-desc"><strong>Intersección:</strong> la fusión de dos cartas idénticas para crear cartas de nivel superior.</span>
                </li>
                <li>
                    <span class="formula">A − B</span>
                    <span class="formula-desc"><strong>Diferencia:</strong> el sistema de ventajas elementales, donde un elemento supera al que "resta".</span>
                </li>
                <li>
                    <span class="formula">A<sup>c</sup></span>
                    <span class="formula-desc"><strong>Complemento:</strong> cartas de nivel 3 que quedan fuera de la relación elemental y anulan ventajas y desventajas.</span>
                </li>
            </ul>
        `
    },
    {
        id: 'vision',
        icon: '👁️',
        title: 'Visión del juego',
        body: `
            <p>Durante la partida, el jugador administra recursos (<strong>esencias</strong>), controla un campo de
            <strong>seis espacios</strong>, invoca cartas, realiza fusiones, interactúa con el rival mediante
            ataques y construye estrategias basadas en combinaciones elementales y operaciones matemáticas.</p>
        `
    },
    {
        id: 'resultado',
        icon: '🏆',
        title: 'Resultado',
        body: `
            <p>El resultado es un <strong>TCG elegante, educativo y competitivo</strong>, con una identidad visual
            basada en iconografía elemental, colores definidos y un layout claro optimizado para pantallas modernas.</p>
        `
    }
];