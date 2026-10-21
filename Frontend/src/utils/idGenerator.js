/**
 * Generador de identificadores únicos (lógica pura, sin Phaser ni DOM).
 * Responsabilidad: producir un instanceId único para cada carta en juego,
 * sustituyendo a Phaser.Math.RND.uuid() y desacoplando el modelo (Player,
 * GameMatch) del motor gráfico.
 */

let counter = 0;

/**
 * Devuelve un identificador único. Prefiere crypto.randomUUID cuando está
 * disponible; de lo contrario usa un contador + timestamp como fallback.
 * @returns {string}
 */
export function newId() {
    const crypto = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
    if (crypto && typeof crypto.randomUUID === 'function') {
        try {
            return crypto.randomUUID();
        } catch (e) {
            // Fallback si randomUUID falla en entornos restringidos.
        }
    }
    counter += 1;
    return `id-${Date.now().toString(36)}-${counter.toString(36)}`;
}