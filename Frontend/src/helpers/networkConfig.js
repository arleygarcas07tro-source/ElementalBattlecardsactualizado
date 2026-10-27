const DEFAULT_PORT = 3001;

export function resolveBaseUrl() {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get('backend');
        if (fromQuery) return fromQuery.trim().replace(/\/+$/, '');
        if (window.BACKEND_URL) return String(window.BACKEND_URL).trim().replace(/\/+$/, '');
        const host = window.location.hostname || 'localhost';
        return `http://${host}:${DEFAULT_PORT}`;
    }
    return `http://localhost:${DEFAULT_PORT}`;
}

/**
 * Construye una URL HTTP del backend.
 * Las rutas son relativas a `/api` y NO deben incluir ese prefijo:
 * buildApiUrl('auth/login') -> http://host:3001/api/auth/login
 * buildApiUrl('profile/missions') -> http://host:3001/api/profile/missions
 */
export function buildApiUrl(path = '') {
    const base = resolveBaseUrl();
    const normalized = String(path)
        .trim()
        .replace(/^\/+/, '')
        .replace(/^api\/+/i, '')
        .replace(/^\/+/, '');

    return normalized ? `${base}/api/${normalized}` : `${base}/api`;
}
