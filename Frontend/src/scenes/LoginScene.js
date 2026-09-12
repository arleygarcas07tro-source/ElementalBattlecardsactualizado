import Phaser from 'phaser';

// URL del backend - Ajusta esto según donde esté tu servidor
// Para desarrollo local:
const scriptURL = "http://localhost:3001/api/auth/login";
// Para jugar en LAN (reemplaza 192.168.x.x con la IP del servidor):
// const scriptURL = "http://192.168.x.x:3001/api/auth/login";

export default class LoginScene extends Phaser.Scene {
    constructor() {
        super('LoginScene');
    }

    preload() {
        this.load.video('inicio-video', '/assets/images/LOGIN/Login_fixed.mp4', { muted: true, noAudio: true });
        this.load.image('logo', '/assets/images/Logotipoletras.png');

        this.load.on('loaderror', (file) => console.error('Error al cargar:', file.key, file.url));
        this.load.on('complete', () => console.log('Archivos de LoginScene cargados'));
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
                * {
                    box-sizing: border-box;
                    font-family: "Segoe UI", Tahoma, sans-serif;
                }
                body { margin: 0; }

                .login-ui {
                    width: 300px;
                    padding: 24px 28px;
                    text-align: center;
                }

                .login-ui input {
                    width: 100%;
                    margin: 6px 0;
                    padding: 6px 8px;
                    border-radius: 8px;
                    border: 1px solid #faebc8ff;
                    background: linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0));
                    color: #ffd77a;
                    font-weight: 600;
                    box-shadow: 
                        0 0 8px rgba(0,0,0),
                        0 0 8px rgba(0, 0, 0);
                }

                .login-ui .login-label {
                    display: block;
                    text-align: left;
                    font-size: 14px;
                    color: #ffd77a;
                    font-weight: 600;
                    text-align: center;
                    text-shadow: 0 0 2px #000, 0 0 4px #000, 0 0 6px #000;
                }

                .login-ui button {
                    width: 100%;
                    margin-top: 44px;
                    padding: 8px;
                    border-radius: 10px;
                    border: 1px solid #ffd77a;
                    cursor: pointer;
                    font-weight: 500;
                    box-shadow: 
                        0 0 12px rgba(0, 0, 0) inset,
                        0 0 24px rgba(0, 0, 0) inset,
                        0 0 12px rgba(0, 0, 0);
                    transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms, filter 180ms;
                    will-change: transform;
                }

                .btn-login {
                    background-color: #0b6c64;
                    color: #ffd77a;
                    text-shadow: 0 1px 0 rgba(0,0,0,0.6);
                    border: 1px solid rgba(255,255,255,0.06);
                }

                .login-link {
                    display: block;
                    margin-top: 10px;
                    font-size: 16px;
                    color: #ffd77a;
                    text-decoration: none;
                    cursor: pointer;
                    text-shadow: 0 0 2px #000, 0 0 4px #000, 0 0 6px #000;
                }

                /* Left-side small stacked buttons */
                .left-buttons { position: relative; }
                .left-buttons button {
                    display: block;
                    width: 180px;   
                    margin: 8px 0;
                    padding: 6px 8px;
                    border-radius: 8px;
                    background-color: #0b6c64;
                    box-shadow:
                        0 0 12px rgba(0, 0, 0) inset,
                        0 0 24px rgba(0, 0, 0) inset,
                        0 0 12px rgba(0, 0, 0);
                    color: #ffd77a;
                    border: 1px solid #ffd77a;
                    cursor: pointer;
                    text-align: center;
                    font-weight: 500;
                    transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms, filter 180ms;
                    will-change: transform;
                }
                /* Button animations */
                @keyframes subtle-pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); }
                }
                .btn-login.pulse, .left-buttons button.pulse { animation: subtle-pulse 3.8s ease-in-out infinite; }
                .btn-login.animated, .left-buttons button.animated { backface-visibility: hidden; }
                .login-ui button:hover, .left-buttons button:hover { transform: translateY(-4px) scale(1.03); box-shadow: 0 8px 20px rgba(0,0,0,0.35); }
                .login-ui button:active, .left-buttons button:active { transform: translateY(0) scale(0.98); }
            </style>

                <div class="login-ui">
                    <div style="margin-bottom: 10px;">
                        <label class="login-label">Usuario</label>
                        <input name="username" type="text">
                    </div>
                    <div>
                        <label class="login-label">Contraseña</label>
                        <input name="password" type="password">
                    </div>

                    <button type="button" class="btn-login" id="login-btn">Iniciar sesión</button>

                    <a href="#" id="register-link" class="login-link">¿No tienes cuenta? <strong>Crear cuenta</strong></a>
                </div>
        `;


        this.formElement = this.add.dom(width / 2, height / 2).createFromHTML(formHTML);

        // Inicializar animaciones en botones del formulario
        try {
            const formNode = this.formElement.node;
            const loginBtn = formNode.querySelector('.btn-login');
            if (loginBtn) {
                loginBtn.classList.add('animated', 'pulse');
                loginBtn.style.animationDelay = (Math.random() * 2) + 's';
                loginBtn.addEventListener('pointerdown', () => { loginBtn.style.transform = 'translateY(0) scale(0.98)'; });
                loginBtn.addEventListener('pointerup', () => { loginBtn.style.transform = ''; });
                loginBtn.addEventListener('pointerleave', () => { loginBtn.style.transform = ''; });
            }
        } catch (e) {
            console.warn('No se pudo inicializar animaciones en LoginScene', e);
        }

        const loginButton = this.formElement.node.querySelector('.btn-login');
        const usernameInput = this.formElement.getChildByName('username') || this.formElement.node.querySelector('input[name="username"]');
        const passwordInput = this.formElement.getChildByName('password') || this.formElement.node.querySelector('input[name="password"]');

        loginButton.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (!username || !password) {
                alert('Por favor, introduce usuario y contraseña.');
                return;
            }

            loginButton.disabled = true;
            loginButton.style.opacity = '0.7';
            loginButton.textContent = 'Entrando...';

            try {
                const response = await fetch(scriptURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Guardar el token en localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Transicionar a la pantalla de carga
                    this.scene.start('LoadingScene', { playerData: data.user });
                } else {
                    alert(data.message || 'Error al iniciar sesión');
                    loginButton.disabled = false;
                    loginButton.style.opacity = '1';
                    loginButton.textContent = 'Iniciar sesión';
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error de conexión con el servidor: ' + error.message);
                loginButton.disabled = false;
                loginButton.style.opacity = '1';
                loginButton.textContent = 'Iniciar sesión';
            }
        });

        // Event listener para el link de crear cuenta
        const registerLink = this.formElement.node.querySelector('#register-link');
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.scene.start('RegisterScene');
            });
        }

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
