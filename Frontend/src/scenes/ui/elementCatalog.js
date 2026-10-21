/**
 * Catálogo único de los 6 elementos elementales del juego (capa de datos pura).
 * Consolidación de los arrays ELEMENTS que estaban duplicados en las escenas.
 *
 * Las claves canónicas coinciden con CARD_TYPES de helpers/constants.js y con
 * los nombres reales de los assets (iconos y cartas): luz, espiritu, planta,
 * sombra. El nombre mostrado al usuario conserva el que usaban los menús
 * (Aire, Tierra, Naturaleza, Oscuridad).
 */

export const ELEMENTS = [
    { key: 'agua',       name: 'Agua',       color: '#38bdf8', soft: 'rgba(56,189,248,0.14)',  glow: 'rgba(56,189,248,0.42)',  img: '/assets/images/iconos/agua.jpeg' },
    { key: 'fuego',      name: 'Fuego',      color: '#fb5a2a', soft: 'rgba(251,90,42,0.14)',   glow: 'rgba(251,90,42,0.42)',   img: '/assets/images/iconos/fuego.jpeg' },
    { key: 'luz',        name: 'Aire',       color: '#6fe3ff', soft: 'rgba(111,227,255,0.14)', glow: 'rgba(111,227,255,0.42)', img: '/assets/images/iconos/luz.jpeg' },
    { key: 'espiritu',   name: 'Tierra',     color: '#a78bfa', soft: 'rgba(167,139,250,0.14)', glow: 'rgba(167,139,250,0.42)', img: '/assets/images/iconos/espiritu.jpeg' },
    { key: 'planta',     name: 'Naturaleza', color: '#34d97b', soft: 'rgba(52,217,123,0.14)',  glow: 'rgba(52,217,123,0.42)',  img: '/assets/images/iconos/planta.jpeg' },
    { key: 'sombra',     name: 'Oscuridad',  color: '#c026d3', soft: 'rgba(192,38,211,0.16)',  glow: 'rgba(192,38,211,0.45)',  img: '/assets/images/iconos/sombra.jpeg' }
];

/**
 * Alias de presentación que usaban variantes de los menús
 * (aire -> luz, tierra -> espiritu, naturaleza -> planta, oscuridad -> sombra).
 */
export const ELEMENT_ALIASES = {
    aire: 'luz',
    tierra: 'espiritu',
    naturaleza: 'planta',
    oscuridad: 'sombra'
};

/**
 * Devuelve el elemento canónico a partir de su clave o de un alias.
 * @param {string} key
 * @returns {{key:string, name:string, color:string, soft:string, glow:string, img:string}|undefined}
 */
export function elementByKey(key) {
    const canonicalKey = ELEMENT_ALIASES[key] || key;
    return ELEMENTS.find(el => el.key === canonicalKey);
}

/**
 * Genera el HTML de los orbes de navegación inferior (idéntico en todos los menús).
 * @returns {string}
 */
export function elementsNavHTML() {
    return ELEMENTS.map(el => `
        <span class="nav-orb" style="--el:${el.color}; --el-soft:${el.soft};" title="${el.name}">
            <img src="${el.img}" alt="${el.name}">
        </span>
    `).join('');
}

/**
 * Genera las motas de energía flotantes del fondo de los menús.
 * @param {{count?:number, leftOffset?:number, leftSlope?:number, leftMod?:number,
 *          topOffset?:number, topSlope?:number, topMod?:number, delayStep?:number}} [options]
 * @returns {string}
 */
export function energyParticlesHTML({
    count = 10,
    leftOffset = 4, leftSlope = 37, leftMod = 92,
    topOffset = 8, topSlope = 53, topMod = 70,
    delayStep = -1.4
} = {}) {
    return Array.from({ length: count }, (_, i) => {
        const left = Math.round(leftOffset + ((i * leftSlope) % leftMod));
        const top = Math.round(topOffset + ((i * topSlope) % topMod));
        const size = 3 + (i % 3) * 2;
        const delay = (i % 6) * delayStep;
        return `<span class="energy" style="left:${left}%; top:${top}%; width:${size}px; height:${size}px; animation-delay:${delay}s;"></span>`;
    }).join('');
}

const ICON_FALLBACKS = {
    agua: '💧',
    fuego: '🔥',
    espiritu: '🌍',
    luz: '🌬️',
    planta: '🌿',
    sombra: '🌑'
};

/**
 * Iconos elementales para la escena de carga (key de textura, etiqueta y emoji).
 * @returns {{key:string, label:string, fallback:string}[]}
 */
export const ELEMENT_ICONS = ELEMENTS.map(el => ({
    key: `icon-${el.key}`,
    label: el.name,
    fallback: ICON_FALLBACKS[el.key]
}));