import Phaser from 'phaser';
import { setMusicVolume, setEffectsVolume } from '../helpers/audioManager.js';

export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
        this.playerData = {};
        this.returnScene = 'HomeScenes';
        this.settings = {
            musicVolume: 80,
            effectsVolume: 65,
            accountLinked: false
        };
    }

    init(data) {
        this.playerData = data.playerData || {};
        this.returnScene = data.returnScene || 'HomeScenes';
        this.settings = {
            ...this.settings,
            ...(data.settings || {})
        };
    }

    create() {
        const { width, height } = this.scale;

        const html = `
            <div class="settings-root">
                <style>
                    .settings-root {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0, 0, 0, 0.62);
                        font-family: Poppins, Arial, sans-serif;
                        color: white;
                        overflow: hidden;
                    }
                    .settings-panel {
                        width: min(840px, 90vw);
                        border-radius: 24px;
                        background: rgba(9, 9, 13, 0.95);
                        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        padding: 28px;
                        display: grid;
                        gap: 24px;
                    }
                    .settings-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 16px;
                    }
                    .settings-header h1 {
                        margin: 0;
                        font-size: 28px;
                        letter-spacing: 0.04em;
                    }
                    .btn-back {
                        border: 1px solid rgba(241, 231, 188, 0.25);
                        background: rgba(241, 231, 188, 0.08);
                        color: #f1e7bc;
                        padding: 12px 18px;
                        border-radius: 14px;
                        cursor: pointer;
                        font-weight: 700;
                    }
                    .btn-back, .btn-link {
                        transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms, filter 180ms;
                        will-change: transform;
                    }
                    @keyframes subtle-pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.02); }
                        100% { transform: scale(1); }
                    }
                    .btn-back.pulse, .btn-link.pulse { animation: subtle-pulse 3.8s ease-in-out infinite; }
                    .btn-back.animated, .btn-link.animated { backface-visibility: hidden; }
                    .btn-back:hover, .btn-link:hover { transform: translateY(-4px) scale(1.03); box-shadow: 0 8px 20px rgba(0,0,0,0.35); }
                    .btn-back:active, .btn-link:active { transform: translateY(0) scale(0.98); }
                    .settings-grid {
                        display: grid;
                        gap: 20px;
                    }
                    .section {
                        background: rgba(255,255,255,0.04);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 20px;
                        padding: 20px;
                        display: grid;
                        gap: 18px;
                    }
                    .section-title {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 16px;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        color: #f1e7bc;
                    }
                    .section-title span {
                        width: 38px;
                        height: 38px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        background: rgba(241,231,188,0.14);
                    }
                    .setting-row {
                        display: grid;
                        gap: 10px;
                    }
                    .setting-label {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 12px;
                        font-size: 14px;
                        color: rgba(255,255,255,0.86);
                    }
                    .setting-label strong {
                        font-weight: 700;
                        color: #f1e7bc;
                    }
                    .slider-bar {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                    }
                    .slider-bar input[type=range] {
                        width: 100%;
                        accent-color: #f1e7bc;
                    }
                    .slider-value {
                        width: 42px;
                        text-align: right;
                        font-weight: 700;
                        color: #f1e7bc;
                    }
                    .account-card {
                        display: grid;
                        gap: 16px;
                        padding: 18px;
                        border-radius: 18px;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.08);
                    }
                    .account-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 14px;
                        font-size: 14px;
                        color: rgba(255,255,255,0.85);
                    }
                    .account-row strong {
                        font-weight: 700;
                        color: #fff;
                    }
                    .account-actions {
                        display: flex;
                        justify-content: flex-end;
                    }
                    .btn-link {
                        border: none;
                        border-radius: 14px;
                        background: linear-gradient(135deg, #f5d86b, #e0b230);
                        color: #1f1a0f;
                        font-weight: 700;
                        padding: 12px 20px;
                        cursor: pointer;
                    }
                </style>
                <div class="settings-panel">
                    <div class="settings-header">
                        <div>
                            <h1>Ajustes</h1>
                            <p style="margin:4px 0 0; color: rgba(255,255,255,0.72); font-size: 14px;">Personaliza sonido y cuenta.</p>
                        </div>
                        <button class="btn-back" id="settings-back">Volver</button>
                    </div>

                    <div class="settings-grid">
                        <div class="section">
                            <div class="section-title"><span>🔊</span> Sonido</div>
                            <div class="setting-row">
                                <div class="setting-label">
                                    <span>Música de fondo</span>
                                    <strong id="music-value">${this.settings.musicVolume}%</strong>
                                </div>
                                <div class="slider-bar">
                                    <input id="music-volume" type="range" min="0" max="100" value="${this.settings.musicVolume}">
                                </div>
                            </div>
                            <div class="setting-row">
                                <div class="setting-label">
                                    <span>Efectos de hechizo</span>
                                    <strong id="effects-value">${this.settings.effectsVolume}%</strong>
                                </div>
                                <div class="slider-bar">
                                    <input id="effects-volume" type="range" min="0" max="100" value="${this.settings.effectsVolume}">
                                </div>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title"><span>👤</span> Cuenta</div>
                            <div class="account-card">
                                <div class="account-row">
                                    <span>Estado de la cuenta</span>
                                    <strong id="account-status">${this.settings.accountLinked ? 'Vinculado' : `Invitado (ID: #${this.playerData?.id || this.playerData?._id || '48291'})`}</strong>
                                </div>
                                <div class="account-actions">
                                    <button class="btn-link" id="link-email">${this.settings.accountLinked ? 'Correo vinculado' : 'Vincular correo'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.domElement = this.add.dom(0, 0).createFromHTML(html);
        this.domElement.setOrigin(0);
        this.domElement.setDepth(9999);
        const node = this.domElement.node;
        node.style.position = 'absolute';
        node.style.left = '0';
        node.style.top = '0';
        node.style.width = `${width}px`;
        node.style.height = `${height}px`;
        node.style.pointerEvents = 'auto';

        const backButton = node.querySelector('#settings-back');
        const musicSlider = node.querySelector('#music-volume');
        const effectsSlider = node.querySelector('#effects-volume');
        const musicValue = node.querySelector('#music-value');
        const effectsValue = node.querySelector('#effects-value');
        const linkEmail = node.querySelector('#link-email');
        const accountStatus = node.querySelector('#account-status');

        if (backButton) {
            backButton.addEventListener('click', () => {
                this.scene.start(this.returnScene, { playerData: this.playerData });
            });
        }

        // Inicializar animaciones en botones de ajustes
        try {
            if (backButton) {
                backButton.classList.add('animated', 'pulse');
                backButton.style.animationDelay = (Math.random() * 2) + 's';
                backButton.addEventListener('pointerdown', () => { backButton.style.transform = 'translateY(0) scale(0.98)'; });
                backButton.addEventListener('pointerup', () => { backButton.style.transform = ''; });
                backButton.addEventListener('pointerleave', () => { backButton.style.transform = ''; });
            }
            if (linkEmail) {
                linkEmail.classList.add('animated', 'pulse');
                linkEmail.style.animationDelay = (Math.random() * 2) + 's';
                linkEmail.addEventListener('pointerdown', () => { linkEmail.style.transform = 'translateY(0) scale(0.98)'; });
                linkEmail.addEventListener('pointerup', () => { linkEmail.style.transform = ''; });
                linkEmail.addEventListener('pointerleave', () => { linkEmail.style.transform = ''; });
            }
        } catch (e) {
            console.warn('No se pudieron inicializar animaciones en SettingsScene', e);
        }

        if (musicSlider && musicValue) {
            musicSlider.addEventListener('input', () => {
                this.settings.musicVolume = Number(musicSlider.value);
                musicValue.textContent = `${this.settings.musicVolume}%`;
                setMusicVolume(this.settings.musicVolume);
            });
        }
        if (effectsSlider && effectsValue) {
            effectsSlider.addEventListener('input', () => {
                this.settings.effectsVolume = Number(effectsSlider.value);
                effectsValue.textContent = `${this.settings.effectsVolume}%`;
                setEffectsVolume(this.settings.effectsVolume);
            });
        }
        if (linkEmail && accountStatus) {
            linkEmail.addEventListener('click', () => {
                if (!this.settings.accountLinked) {
                    this.settings.accountLinked = true;
                    accountStatus.textContent = 'Vinculado';
                    linkEmail.textContent = 'Correo vinculado';
                    alert('Correo vinculado con éxito.');
                } else {
                    alert('La cuenta ya está vinculada.');
                }
            });
        }

        this.scale.on('resize', this.onResize, this);
    }

    onResize(gameSize) {
        const { width, height } = gameSize;
        if (this.domElement && this.domElement.node) {
            this.domElement.node.style.width = `${width}px`;
            this.domElement.node.style.height = `${height}px`;
        }
    }
}
