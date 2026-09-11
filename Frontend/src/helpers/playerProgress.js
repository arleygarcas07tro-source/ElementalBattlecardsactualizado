// Progreso del jugador persistido en localStorage.
// Responsabilidad: llevar el conteo real de victorias, cartas coleccionadas,
// misiones y logros de cara al perfil. No conecta con Phaser ni con el DOM.

const STORAGE_PREFIX = 'ebc_progress_';

const TOTAL_CARDS = 18;

const MISSION_TARGETS = {
    'primera-victoria': 1,
    'coleccionista': 1,
    'fusionador': 5,
    'racha-victorias': 3,
    'aprendiz-elemental': 6,
    'estratega': 1
};

const MISSION_DEFAULTS = Object.keys(MISSION_TARGETS).reduce((acc, id) => {
    acc[id] = 0;
    return acc;
}, {});

function storageKeyFor(username) {
    const safe = String(username || 'jugador').trim().toLowerCase() || 'jugador';
    return STORAGE_PREFIX + safe;
}

function baseProgress() {
    return {
        battlesPlayed: 0,
        battlesWon: 0,
        currentStreak: 0,
        longestStreak: 0,
        collected: [],
        missions: { ...MISSION_DEFAULTS }
    };
}

function load(username) {
    let stored = null;
    try {
        stored = JSON.parse(localStorage.getItem(storageKeyFor(username)) || 'null');
    } catch (e) {
        stored = null;
    }
    const progress = { ...baseProgress(), ...(stored || {}) };
    progress.missions = { ...MISSION_DEFAULTS, ...(progress.missions || {}) };
    progress.collected = Array.isArray(progress.collected) ? progress.collected : [];
    return progress;
}

function save(username, progress) {
    try {
        localStorage.setItem(storageKeyFor(username), JSON.stringify(progress));
    } catch (e) {
        console.warn('[playerProgress] No se pudo guardar el progreso:', e);
    }
}

function mergeValue(list, value) {
    if (!list.includes(value)) list.push(value);
}

/**
 * Registra una victoria real (racha, total y misiones que dependen de ella).
 */
export function recordVictory(username) {
    const progress = load(username);
    progress.battlesPlayed += 1;
    progress.battlesWon += 1;
    progress.currentStreak += 1;
    progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
    progress.missions['primera-victoria'] = Math.min(progress.missions['primera-victoria'] + 1, MISSION_TARGETS['primera-victoria']);
    save(username, progress);
    return progress;
}

/**
 * Registra una derrota real (reinicia la racha actual).
 */
export function recordDefeat(username) {
    const progress = load(username);
    progress.battlesPlayed += 1;
    progress.currentStreak = 0;
    save(username, progress);
    return progress;
}

/**
 * Registra una fusión de cartas del jugador.
 */
export function recordFusion(username) {
    const progress = load(username);
    progress.missions['fusionador'] += 1;
    save(username, progress);
    return progress;
}

/**
 * Registra que el jugador logró colocar los 6 tipos elementales en su campo.
 */
export function recordFieldComplete(username) {
    const progress = load(username);
    progress.missions['coleccionista'] = Math.max(progress.missions['coleccionista'], 1);
    save(username, progress);
    return progress;
}

/**
 * Registra una victoria manteniendo una carta de nivel 3 en el campo.
 */
export function recordLevel3Win(username) {
    const progress = load(username);
    progress.missions['estratega'] = 1;
    save(username, progress);
    return progress;
}

/**
 * Registra un ataque con un tipo elemental (misión "Aprendiz elemental").
 */
export function recordAttackWithType(username, type) {
    const progress = load(username);
    progress.missions['aprendiz-elemental'] = Math.max(progress.missions['aprendiz-elemental'], 1);
    if (type) {
        const key = `${type}`;
        if (!progress.missions._attackTypes) progress.missions._attackTypes = [];
        const list = progress.missions._attackTypes;
        if (!list.includes(key)) {
            list.push(key);
            progress.missions['aprendiz-elemental'] = list.length;
        }
    }
    save(username, progress);
    return progress;
}

/**
 * Registra una carta del mundo elemental como coleccionada (18 totales).
 */
export function recordCollectedCard(username, type, level) {
    if (!type) return;
    const progress = load(username);
    mergeValue(progress.collected, `${type}-${level}`);
    save(username, progress);
    return progress;
}

/**
 * Devuelve el mapa de progreso actual de las misiones (con los cálculos
 * derivados como racha o primera victoria).
 */
export function getMissionProgress(username) {
    const progress = load(username);
    return {
        'primera-victoria': Math.min(progress.missions['primera-victoria'], MISSION_TARGETS['primera-victoria']),
        'coleccionista': Math.min(progress.missions['coleccionista'], MISSION_TARGETS['coleccionista']),
        'fusionador': Math.min(progress.missions['fusionador'], Number.MAX_SAFE_INTEGER),
        'racha-victorias': Math.min(progress.currentStreak, MISSION_TARGETS['racha-victorias']),
        'aprendiz-elemental': Math.min(progress.missions['aprendiz-elemental'], MISSION_TARGETS['aprendiz-elemental']),
        'estratega': Math.min(progress.missions['estratega'], MISSION_TARGETS['estratega'])
    };
}

/**
 * Devuelve el progreso crudo (para poder persistirlo tras modificaciones).
 */
export function loadProgress(username) {
    return load(username);
}

/**
 * Guarda un objeto de progreso previamente obtenido con loadProgress.
 */
export function saveProgress(username, progress) {
    save(username, progress);
}

function rankFor(wins) {
    if (wins <= 0) return 'Novato';
    if (wins < 10) return 'Bronce';
    if (wins < 25) return 'Plata';
    if (wins < 50) return 'Oro';
    if (wins < 100) return 'Platino';
    return 'Diamante';
}

/**
 * Construye el paquete de estadísticas que consume el perfil, incluyendo
 * nivel/XP derivados de las victorias y el estado de logros/misiones.
 */
export function getProfileStats(username) {
    const progress = load(username);
    const missions = getMissionProgress(username);

    let missionsCompleted = 0;
    Object.keys(MISSION_TARGETS).forEach(id => {
        if (missions[id] >= MISSION_TARGETS[id]) missionsCompleted += 1;
    });

    const collectedCards = progress.collected.length;
    const totalXp = progress.battlesWon * 100;
    const xpMaxima = 300;
    const nivel = 1 + Math.floor(totalXp / xpMaxima);
    const xpActual = totalXp % xpMaxima;

    const firstWin = progress.battlesWon >= 1;
    const streak3 = progress.longestStreak >= 3;
    const fusions5 = progress.missions['fusionador'] >= 5;
    const allMissions = missionsCompleted >= Object.keys(MISSION_TARGETS).length;
    const tenWins = progress.battlesWon >= 10;
    const fullCollection = collectedCards >= TOTAL_CARDS;

    const achievements = [firstWin, streak3, fusions5, allMissions, tenWins, fullCollection]
        .filter(Boolean).length;

    return {
        battlesPlayed: progress.battlesPlayed,
        battlesWon: progress.battlesWon,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        collectedCards,
        collectedTotal: TOTAL_CARDS,
        missions,
        missionsCompleted,
        achievements,
        nivel,
        xpActual,
        xpMaxima,
        ranking: rankFor(progress.battlesWon),
        firstWin,
        streak3,
        fusions5,
        allMissions,
        tenWins,
        fullCollection
    };
}