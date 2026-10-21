import Phaser from 'phaser';
import { play as playSfx } from '../../helpers/audioManager.js';

/**
 * Base común para las escenas de menú construidas con DOM de Phaser.
 * Centraliza el ciclo de montaje/responsive/limpieza (SRP): las escenas hijas
 * solo aportan su contenido y sus eventos específicos y, al salir, todos los
 * listeners registrados se desregistran y el DOM se destruye (evita fugas).
 */
export default class DomSceneBase extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.listeners = [];
        this._shutdownDone = false;
    }

    /**
     * Crea el elemento DOM de Phaser, lo posiciona a pantalla completa y
     * registra los manejadores de resize y shutdown.
     * @param {string} html
     * @param {{flex?:boolean}} [options]
     * @returns {HTMLElement} El nodo raíz del DOM creado.
     */
    mountDOM(html, { flex = false } = {}) {
        const { width, height } = this.scale;
        this._shutdownDone = false;

        this.domUI = this.add.dom(0, 0).createFromHTML(html);
        this.domUI.setOrigin(0);
        this.domUI.setDepth(9999);

        const node = this.domUI.node;
        node.style.position = 'absolute';
        node.style.left = '0';
        node.style.top = '0';
        if (flex) {
            node.style.display = 'flex';
            node.style.flexDirection = 'column';
        }
        node.style.width = width + 'px';
        node.style.height = height + 'px';

        this.scale.on('resize', this.onResize, this);
        this.events.on('shutdown', this.onShutdown, this);
        return node;
    }

    /**
     * Registra un listener en un elemento y lo deja administrado para limpiarlo
     * automáticamente en el shutdown.
     * @param {HTMLElement} element
     * @param {Function} handler
     * @param {string} [type]
     * @returns {Function} El handler creado.
     */
    track(element, handler, type = 'click') {
        if (!element) return handler;
        element.addEventListener(type, handler);
        this.listeners.push({ el: element, handler, type });
        return handler;
    }

    /**
     * Vincula un evento click + sonido a todos los elementos que coinciden con
     * el selector dentro del DOM de la escena.
     * @param {string} selector
     * @param {Function} fn
     */
    bind(selector, fn) {
        const node = this.domUI && this.domUI.node;
        if (!node) return;
        node.querySelectorAll(selector).forEach(el => {
            this.track(el, ev => { ev.preventDefault(); playSfx('click', this); fn(ev, el); }, 'click');
        });
    }

    /**
     * Igual que bind() pero para un elemento concreto.
     * @param {HTMLElement} element
     * @param {Function} fn
     */
    bindElement(element, fn) {
        if (!element) return;
        this.track(element, ev => { ev.preventDefault(); playSfx('click', this); fn(ev); }, 'click');
    }

    onResize(gameSize) {
        if (!gameSize) return;
        const { width, height } = gameSize;
        if (this.domUI && this.domUI.node) {
            this.domUI.node.style.width = width + 'px';
            this.domUI.node.style.height = height + 'px';
        }
    }

    onShutdown() {
        if (this._shutdownDone) return;
        this._shutdownDone = true;
        this.listeners.forEach(({ el, handler, type }) => {
            if (el && el.removeEventListener) el.removeEventListener(type || 'click', handler);
        });
        this.listeners = [];
        this.scale.off('resize', this.onResize, this);
        if (this.domUI) {
            this.domUI.destroy();
            this.domUI = null;
        }
    }
}