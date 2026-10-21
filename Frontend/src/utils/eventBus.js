/**
 * Bus de eventos mínimo y puro (sin Phaser ni DOM).
 * Responsabilidad: permitir que las clases de dominio (Player, GameMatch)
 * notifiquen cambios de estado sin depender del sistema de Events de una
 * Scene ni del DOM. En modos suscripción/emisión con desuscripción.
 */
export default class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    /**
     * Suscribe un manejador a un evento.
     * @param {string} event
     * @param {Function} handler
     * @returns {() => void} Función para desuscribirse.
     */
    on(event, handler) {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        const list = this._listeners.get(event);
        if (!list.includes(handler)) list.push(handler);
        return () => this.off(event, handler);
    }

    /**
     * Desuscribe un manejador de un evento.
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) {
        const list = this._listeners.get(event);
        if (!list) return;
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
    }

    /**
     * Emite un evento con argumentos.
     * @param {string} event
     * @param {...*} args
     * @returns {boolean} true si había al menos un listener.
     */
    emit(event, ...args) {
        const list = this._listeners.get(event);
        if (!list || list.length === 0) return false;
        list.slice().forEach(handler => {
            try {
                handler(...args);
            } catch (e) {
                console.warn(`[EventBus] Error en listener de '${event}':`, e);
            }
        });
        return true;
    }

    /**
     * Elimina todos los listeners.
     */
    removeAllListeners() {
        this._listeners.clear();
    }
}