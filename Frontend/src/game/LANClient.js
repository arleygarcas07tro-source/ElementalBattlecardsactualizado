/**
 * Cliente LAN: encapsula el protocolo de red (socket.io) entre la escena y el
 * servidor. Centraliza la serialización de game_event, el filtrado de ecos y
 * los eventos de turno. No contiene lógica de juego.
 */
export default class LANClient {
    /**
     * @param {object} socket Socket.io del cliente.
     * @param {string|null} playerRole Rol local ('player' u 'opponent').
     */
    constructor(socket, playerRole) {
        this.socket = socket;
        this.playerRole = playerRole || null;
    }

    /**
     * Suscribe un manejador a los eventos de juego remotos entrantes.
     * @param {(payload: object) => void} handler
     */
    onGameEvent(handler) {
        if (this.socket) this.socket.on('game_event', handler);
    }

    /**
     * Suscribe un manejador a los cambios de turno del servidor.
     * @param {(data: object) => void} handler
     */
    onTurnChanged(handler) {
        if (this.socket) this.socket.on('turn_changed', handler);
    }

    /**
     * Emite un evento de juego al oponente remoto.
     * Adjunta automáticamente actor y playerRole al payload.
     * @param {object} payload Datos del evento (incluye `type`).
     * @returns {boolean} true si el evento se emitió.
     */
    emitGameEvent(payload) {
        if (!this.socket) {
            console.warn('[LANClient] Sin socket: no se pudo emitir game_event', payload && payload.type);
            return false;
        }
        try {
            this.socket.emit('game_event', {
                actor: 'player',
                playerRole: this.playerRole,
                ...payload
            });
            return true;
        } catch (e) {
            console.warn('[LANClient] No se pudo emitir evento de juego:', e);
            return false;
        }
    }

    /**
     * Notifica al servidor el fin de turno del cliente local.
     * @returns {boolean} true si el evento se emitió.
     */
    emitEndTurn() {
        if (!this.socket) {
            console.warn('[LANClient] Sin socket: no se pudo emitir end_turn');
            return false;
        }
        try {
            this.socket.emit('end_turn', { playerRole: this.playerRole });
            return true;
        } catch (e) {
            console.warn('[LANClient] No se pudo emitir fin de turno:', e);
            return false;
        }
    }
}