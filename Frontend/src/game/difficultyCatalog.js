/**
 * Catálogo de los 10 niveles de dificultad del bot (capa de datos del dominio).
 * GameScene y BotAI interpretan esta semántica numérica (1-10).
 */

export const DIFFICULTY_LEVELS = [
    { level: 1,  name: 'Muy Fácil',   icon: 'agua',    clr: '#5bc0ff', desc: 'El bot comete errores, no fusiona cartas.' },
    { level: 2,  name: 'Fácil',       icon: 'planta',  clr: '#7fe09a', desc: 'El bot juega con decisiones predecibles.' },
    { level: 3,  name: 'Normal',      icon: 'luz',     clr: '#f1c86a', desc: 'El bot juega bien y utiliza fusiones.' },
    { level: 4,  name: 'Difícil',     icon: 'fuego',   clr: '#ff9a5c', desc: 'El bot juega óptimamente con estrategia.' },
    { level: 5,  name: 'Muy Difícil', icon: 'sombra',  clr: '#b78bff', desc: 'El bot juega de forma casi perfecta.' },
    { level: 6,  name: 'Experto',     icon: 'espiritu', clr: '#8b5cf6', desc: 'El bot predice movimientos y juega agresivamente.' },
    { level: 7,  name: 'Maestro',     icon: 'agua',    clr: '#3b82f6', desc: 'El bot usa estrategias avanzadas y contrajuega.' },
    { level: 8,  name: 'Gran Maestro', icon: 'fuego',  clr: '#ff5c5c', desc: 'El bot juega con precisión quirúrgica.' },
    { level: 9,  name: 'Leyenda',     icon: 'planta',  clr: '#34d399', desc: 'El bot es prácticamente imbatible.' },
    { level: 10, name: 'Mito',        icon: 'luz',     clr: '#ffd666', desc: 'El bot juega como una deidad del juego.' }
];