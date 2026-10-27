import Phaser from 'phaser';
import { buildApiUrl } from '../helpers/networkConfig.js';

const scriptURL = buildApiUrl('auth/register');

export default class RegisterSceneUpdated extends Phaser.Scene {
    constructor() {
        super('RegisterScene');
    }

    preload() {
        this.load.video('inicio-video', '/assets/images/LOGIN/Login_fixed.mp4', { muted: true, noAudio: true });
        this.load.image('logo', '/assets/images/Logotipoletras.png');
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x0f0a1a).setDepth(-2);

        // BACKGROUND VIDEO
        this.bg = this.add.video(width / 2, height / 2, 'inicio-video').setOrigin(0.5);
        this.bg.setDepth(-1); // Poner el video al fondo

        this.bg.on('play', () => {
            const scaleX = width / this.bg.width;
            const scaleY = height / this.bg.height;
            const scale = Math.max(scaleX, scaleY);
            this.bg.setScale(scale);
        });

        this.bg.once('created', () => {
            const videoEl = this.bg.video;
            if (!videoEl) return;
            videoEl.muted = true;
            videoEl.defaultMuted = true;
            videoEl.loop = true;
            videoEl.play().catch(() => {});
        });

        this.bg.play(true); // Reproducir en bucle
        const formHTML = `
            <style>
                * { box-sizing: border-box; font-family: "Segoe UI", Tahoma, sans-serif; }
                .register-ui { 
                    width: 300px;
                    padding: 22px;
                    text-align: center;
                }
                .register-ui input {
                    width: 100%;
                    margin: 8px 0;
                    padding: 8px 10px;
                    border-radius: 8px;
                    border: 1px solid #faebc8ff;
                    background: linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0));
                    color: #ffd77a;
                    font-weight: 600;
                    box-shadow: 0 0 8px rgba(0,0,0);
                }
                .register-ui .label { 
                    display: block;
                    text-align: left;
                    font-size: 14px;
                    color: #ffd77a;
                    font-weight: 600;
                    text-align: center;
                    text-shadow: 0 0 2px #000, 0 0 4px #000, 0 0 6px #000;
                }
                .register-ui button {
                    width: 100%;
                    margin-top: 18px; padding: 10px;
                    border-radius: 10px;
                    border: 1px solid #ffd77a;
                    cursor: pointer;
                    font-weight: 600;
                    transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms, filter 180ms;
                    will-change: transform;
                }
                .btn-create {
                    background-color: #0b6c64;
                    box-shadow:
                        0 0 12px rgba(0, 0, 0) inset,
                        0 0 24px rgba(0, 0, 0) inset,
                        0 0 12px rgba(0, 0, 0);
                    color: #ffd77a;
                    text-shadow: 0 1px 0 rgba(0,0,0,0.6);
                    transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms, filter 180ms;
                }
                @keyframes subtle-pulse { 0% { transform: scale(1);} 50% { transform: scale(1.02);} 100% { transform: scale(1);} }
                .btn-create.pulse { animation: subtle-pulse 3.8s ease-in-out infinite; }
                .btn-create.animated { backface-visibility: hidden; }
                .register-ui button:hover { transform: translateY(-4px) scale(1.03); box-shadow: 0 8px 20px rgba(0,0,0,0.35); }
                .register-ui button:active { transform: translateY(0) scale(0.98); }
                }
                .register-link {
                    display: block;
                    margin-top: 10px;
                    font-size: 16px;
                    color: #ffd77a;
                    text-decoration: none;
                    cursor: pointer;
                    text-shadow: 0 0 2px #000, 0 0 4px #000, 0 0 6px #000;
                }
            </style>

            <div class="register-ui">
                <div>
                    <label class="label">Usuario</label>
                    <input name="username" type="text">
                </div>
                <div>
                    <label class="label">Email</label>
                    <input name="email" type="email">
                </div>
                <div>
                    <label class="label">Contraseña</label>
                    <input name="password" type="password">
                </div>
                <div style="margin-bottom: 16px;">
                    <label class="label">Confirmar contraseña</label>
                    <input name="passwordConfirm" type="password">
                </div>

                <button type="button" class="btn-create" id="create-btn">Crear cuenta</button>

                <a href="#" id="login-link" class="register-link">¿Ya tienes cuenta? <strong>Iniciar sesión</strong></a>
            </div>
        `;

        this.formElement = this.add.dom(width / 2, height / 2).createFromHTML(formHTML);

        const createBtn = this.formElement.node.querySelector('#create-btn');
        const usernameInput = this.formElement.getChildByName('username') || this.formElement.node.querySelector('input[name="username"]');
        const emailInput = this.formElement.getChildByName('email') || this.formElement.node.querySelector('input[name="email"]');
        const passwordInput = this.formElement.getChildByName('password') || this.formElement.node.querySelector('input[name="password"]');
        const passwordConfirmInput = this.formElement.getChildByName('passwordConfirm') || this.formElement.node.querySelector('input[name="passwordConfirm"]');

        createBtn.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const passwordConfirm = passwordConfirmInput.value;

            if (!username || !email || !password || !passwordConfirm) { alert('Completa todos los campos.'); return; }
            if (password !== passwordConfirm) { alert('Las contraseñas no coinciden.'); return; }
            // simple email check
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert('Introduce un email válido.'); return; }

            createBtn.disabled = true;
            createBtn.style.opacity = '0.7';
            const prevText = createBtn.textContent;
            createBtn.textContent = 'Creando...';

            try {
                const res = await fetch(scriptURL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const json = await res.json();

                if (res.ok) {
                    alert('Registro exitoso');
                    this.scene.start('LoginScene');
                    return;
                }

                alert('Error al registrar: ' + (json.message || 'Verifica los datos'));
            } catch (err) {
                console.error('Error de conexión/register', err);
                alert('Error de conexión');
            } finally {
                createBtn.disabled = false;
                createBtn.style.opacity = '';
                createBtn.textContent = prevText;
            }
        });

        // Inicializar animaciones en el botón de crear cuenta
        try {
            if (createBtn) {
                createBtn.classList.add('animated', 'pulse');
                createBtn.style.animationDelay = (Math.random() * 2) + 's';
                createBtn.addEventListener('pointerdown', () => { createBtn.style.transform = 'translateY(0) scale(0.98)'; });
                createBtn.addEventListener('pointerup', () => { createBtn.style.transform = ''; });
                createBtn.addEventListener('pointerleave', () => { createBtn.style.transform = ''; });
            }
        } catch (e) {
            console.warn('No se pudieron inicializar animaciones en RegisterScene', e);
        }

        const loginLink = this.formElement.node.querySelector('#login-link');
        loginLink.addEventListener('click', (e) => { e.preventDefault(); this.scene.start('LoginScene'); });

        // Logo arriba
        this.logoImage = this.add.image(this.scale.width / 2, this.scale.height * 0.08, 'logo').setOrigin(0.5).setDepth(1);
        this.logoImage.setScale(Math.min(0.7, (this.scale.width / 800)));

        // Copyright
        this.copyText = this.add.text(this.scale.width / 2, this.scale.height - 18, 'Todos los derechos reservados', {
            fontFamily: 'Segoe UI, Tahoma, sans-serif',
            fontSize: '14px',
            color: '#ffd77a'
        }).setOrigin(0.5, 0.5).setDepth(1);

        // Reposicionar el logo y formulario al redimensionar la ventana
        this.scale.on('resize', this.resize, this);
    }

    resize(gameSize) {
        const { width, height } = gameSize;
        if (this.bg && this.bg.width > 0) {
            const scaleX = width / this.bg.width;
            const scaleY = height / this.bg.height;
            const scale = Math.max(scaleX, scaleY);
            this.bg.setScale(scale);
        }
        if (this.formElement) this.formElement.setPosition(width / 2, height / 2 - 40);
        if (this.leftButtonsElement) this.leftButtonsElement.setPosition(90, height - 120);
        if (this.logoImage) this.logoImage.setPosition(width / 2, height * 0.18);
        if (this.copyText) this.copyText.setPosition(width / 2, height - 18);
    }
}
