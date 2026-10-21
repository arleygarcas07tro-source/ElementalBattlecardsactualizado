/**
 * Catálogo de logros (capa de datos del dominio).
 * Las condiciones consumen las banderas que ya computa playerProgress.getProfileStats.
 */

export const ACHIEVEMENTS = [
    { el: 'fuego',      icon: '🔥', title: 'Primera llama',     desc: 'Gana tu primera batalla contra cualquier oponente.', condition: s => s.firstWin },
    { el: 'agua',       icon: '🌊', title: 'Marea creciente',   desc: 'Consigue una racha de 3 victorias consecutivas.', condition: s => s.streak3 },
    { el: 'naturaleza', icon: '🌱', title: 'Raíces profundas', desc: 'Realiza 5 fusiones de cartas iguales.', condition: s => s.fusions5 },
    { el: 'aire',       icon: '⚡', title: 'Cazador del viento', desc: 'Completa todas las misiones elementales.', condition: s => s.allMissions },
    { el: 'tierra',     icon: '🗿', title: 'Coloso invicto',    desc: 'Gana 10 batallas contra cualquier oponente.', condition: s => s.tenWins },
    { el: 'oscuridad',  icon: '🌑', title: 'Señor de la noche', desc: 'Colecciona las 18 cartas del mundo elemental.', condition: s => s.fullCollection }
];