/**
 * Catálogo de misiones (capa de datos del dominio).
 * Los targets elementales usan claves del catálogo de elementos
 * (resueltas por elementByKey del primer render).
 */

export const MISSIONS = [
    {
        id: 'primera-victoria',
        element: 'fuego',
        title: 'Primera victoria',
        desc: 'Enciende el fuego de tu reinado ganando tu primera batalla contra cualquier oponente.',
        progress: 0,
        target: 1,
        reward: '50',
        unit: 'gemas'
    },
    {
        id: 'coleccionista',
        element: 'agua',
        title: 'Coleccionista',
        desc: 'Coloca los 6 tipos elementales en tu campo en una misma partida.',
        progress: 0,
        target: 1,
        reward: '100',
        unit: 'gemas'
    },
    {
        id: 'fusionador',
        element: 'naturaleza',
        title: 'Fusionador',
        desc: 'Realiza 5 fusiones de cartas iguales.',
        progress: 2,
        target: 5,
        reward: '150',
        unit: 'gemas'
    },
    {
        id: 'racha-victorias',
        element: 'oscuridad',
        title: 'Racha de victorias',
        desc: 'Gana 3 partidas consecutivas contra la IA.',
        progress: 1,
        target: 3,
        reward: '200',
        unit: 'gemas'
    },
    {
        id: 'aprendiz-elemental',
        element: 'aire',
        title: 'Aprendiz elemental',
        desc: 'Ataca al menos una vez con cada uno de los 6 tipos elementales.',
        progress: 4,
        target: 6,
        reward: '120',
        unit: 'gemas'
    },
    {
        id: 'estratega',
        element: 'tierra',
        title: 'Estratega',
        desc: 'Gana una partida manteniendo una carta de nivel 3 en tu campo.',
        progress: 0,
        target: 1,
        reward: '250',
        unit: 'gemas'
    }
];