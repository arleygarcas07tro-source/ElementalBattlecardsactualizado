// Cliente HTTP del perfil de jugador.
// Responsabilidad: hablar con /api/profile adjuntando el JWT; no conoce Phaser.
// Si no hay sesión (sin token), todas las operaciones son no-op (modo offline).

const DEFAULT_PORT = 3001;

function resolveBaseUrl() {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get('backend');
        if (fromQuery) return fromQuery.replace(/\/$/, '');
        if (window.BACKEND_URL) return String(window.BACKEND_URL).replace(/\/$/, '');
        const host = window.location.hostname || 'localhost';
        return `http://${host}:${DEFAULT_PORT}`;
    }
    return `http://localhost:${DEFAULT_PORT}`;
}

const BASE_URL = resolveBaseUrl();

function getToken() {
    try {
        return localStorage.getItem('token');
    } catch {
        return null;
    }
}

export function isAuthenticated() {
    return Boolean(getToken());
}

async function request(path, options = {}) {
    const token = getToken();
    if (!token) return null;

    const response = await fetch(`${BASE_URL}/api/profile${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    if (response.status === 401) {
        console.warn('[profileApi] Token inválido o expirado.');
        return null;
    }
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

export function fetchProfile() {
    return request('');
}

export function fetchMissions() {
    return request('/missions');
}

export function fetchAchievements() {
    return request('/achievements');
}

export function pushBattle(result, options = {}) {
    return request('/battles', { method: 'POST', body: JSON.stringify({ result, ...options }) });
}

export function pushFusion() {
    return request('/fusions', { method: 'POST', body: '{}' });
}

export function pushAttack(element) {
    if (!element) return Promise.resolve(null);
    return request('/attacks', { method: 'POST', body: JSON.stringify({ element }) });
}

export function pushFieldComplete() {
    return request('/field-complete', { method: 'POST', body: '{}' });
}

export function pushCollectedCard(element, level) {
    if (!element) return Promise.resolve(null);
    return request('/collection', { method: 'POST', body: JSON.stringify({ element, level }) });
}
