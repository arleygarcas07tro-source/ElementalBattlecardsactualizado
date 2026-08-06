import Phaser from 'phaser';

export default class ProfileScene extends Phaser.Scene {
    constructor() {
        super('ProfileScene');
        this.playerData = null;
        this.imageChangeListener = null;
        this.backButtonListener = null;
        this.levelHoverIn = null;
        this.levelHoverOut = null;
        this.glowInterval = null;
    }

    init(data) {
        this.playerData = data.playerData || data || {};
    }

    formatProfileId(id) {
        if (!id) return '#EBC-000000';
        const numeric = String(id).replace(/\D/g, '');
        if (!numeric) return `#EBC-${String(id).slice(0, 6).toUpperCase()}`;
        return `#EBC-${numeric.padStart(6, '0')}`;
    }

    create() {
        const { width, height } = this.scale;
        const player = {
            nombre: this.playerData.username || 'ShadowMaster',
            frase: this.playerData.frase || 'El verdadero poder nace del equilibrio.',
            id: this.formatProfileId(this.playerData.id || this.playerData._id || this.playerData.profileId),
            nivel: this.playerData.nivel || this.playerData.level || 35,
            xpActual: this.playerData.xpActual || 2450,
            xpMaxima: this.playerData.xpMaxima || 4000,
            battlesWon: this.playerData.battlesWon || 128,
            longestStreak: this.playerData.longestStreak || 12,
            missionsCompleted: this.playerData.missionsCompleted || 243,
            achievements: this.playerData.achievements || 37
        };

        const xpPercent = Math.min(100, Math.round((player.xpActual / player.xpMaxima) * 100));

        const html = `
        <style>
            :host { box-sizing: border-box; }
            .profile-root {
                position: absolute;
                inset: 0;
                overflow: auto;
                background:
                    linear-gradient(180deg, rgba(5, 8, 25, 0.96), rgba(5, 8, 25, 0.88)),
                    url("assets/images/backgrounds/profile-bg.jpg");
                background-size: cover;
                background-position: center;
                color: white;
                font-family: Poppins, Arial, sans-serif;
                padding: 32px;
            }
            .profile-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 20px;
                flex-wrap: wrap;
                margin-bottom: 28px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.08);
            }
            .profile-title {
                margin: 0;
                font-size: 36px;
                letter-spacing: 0.04em;
            }
            .btn-back {
                appearance: none;
                border: 1px solid rgba(255,255,255,0.18);
                background: rgba(255,255,255,0.08);
                color: white;
                border-radius: 16px;
                padding: 14px 20px;
                font-size: 14px;
                cursor: pointer;
                box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
                transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
            }
            .btn-back:hover {
                background: rgba(255,255,255,0.16);
                transform: translateY(-2px);
                box-shadow: 0 18px 32px rgba(0, 0, 0, 0.22);
            }
            .profile-grid {
                display: grid;
                grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
                gap: 24px;
            }
            .profile-box {
                background: rgba(12, 18, 40, 0.78);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(255,255,255,0.1);
                box-shadow:
                    0 18px 45px rgba(0, 0, 0, 0.35),
                    inset 0 0 2px rgba(255, 255, 255, 0.05);
                border-radius: 28px;
                padding: 26px;
                display: flex;
                flex-direction: column;
                gap: 24px;
                min-height: 470px;
                justify-content: space-between;
            }
            .profile-preview {
                width: 100%;
                aspect-ratio: 1 / 1;
                border-radius: 20px;
                object-fit: cover;
                border: 2px solid rgba(126, 165, 255, 0.24);
                box-shadow:
                    0 24px 60px rgba(8, 18, 55, 0.35),
                    0 0 25px rgba(93, 147, 255, 0.2);
                transition: transform 0.35s ease, box-shadow 0.35s ease;
                background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));
            }
            .profile-preview:hover {
                transform: scale(1.03);
                box-shadow:
                    0 0 45px rgba(93, 147, 255, 0.45);
            }
            .file-group {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .file-group label {
                font-size: 14px;
                color: rgba(255,255,255,0.85);
            }
            .file-input {
                border-radius: 14px;
                padding: 14px 16px;
                border: 1px solid rgba(255,255,255,0.12);
                background: rgba(255,255,255,0.05);
                color: white;
                cursor: pointer;
            }
            .section {
                background: rgba(12, 18, 40, 0.75);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.08);
                box-shadow:
                    0 0 40px rgba(0, 0, 0, 0.4),
                    0 0 15px rgba(79, 141, 255, 0.15);
                border-radius: 24px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .section h2 {
                margin: 0;
                font-size: 20px;
            }
            .profile-row {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                flex-wrap: wrap;
            }
            .profile-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 18px;
                flex-wrap: wrap;
                margin-bottom: 18px;
            }
            .profile-top-left {
                flex: 1 1 320px;
                min-width: 220px;
            }
            .profile-top-right {
                flex: 0 0 180px;
                min-width: 160px;
            }
            .profile-card {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .profile-info-card,
            .profile-id-card {
                background: rgba(255,255,255,0.06);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(255,255,255,0.14);
                border-radius: 22px;
                padding: 22px;
                box-shadow: inset 0 0 18px rgba(255,255,255,0.05);
            }
            .profile-phrase {
                margin: 14px 0 0;
                color: rgba(255,255,255,0.72);
                font-size: 15px;
                line-height: 1.7;
            }
            .profile-label {
                color: rgba(255,255,255,0.75);
                font-size: 13px;
            }
            .profile-value {
                font-size: 18px;
                font-weight: 700;
                margin: 0;
            }
            .xp-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border-radius: 14px;
                background: rgba(100,216,255,0.18);
                color: #a4f0ff;
                font-weight: 700;
                font-size: 12px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                border: 1px solid rgba(100,216,255,0.22);
            }
            .xp-meta {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                margin-top: 8px;
                font-size: 13px;
                color: rgba(255,255,255,0.75);
            }
            .xp-bar {
                width: 100%;
                height: 18px;
                background: rgba(255,255,255,0.08);
                border-radius: 999px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.16);
                box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.28);
            }
            .xp {
                height: 100%;
                width: 0%;
                border-radius: 999px;
                background: linear-gradient(90deg, #7d72ff, #5ce3ff);
                box-shadow:
                    0 0 24px rgba(92, 232, 255, 0.35),
                    inset 0 0 10px rgba(255,255,255,0.3);
                transition: width 800ms ease;
            }
            .xp-section {
                display: flex;
                flex-direction: column;
                gap: 14px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 24px;
                padding: 22px;
                box-shadow: inset 0 0 14px rgba(255,255,255,0.04);
            }
            .xp-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 6px;
                font-size: 14px;
                color: rgba(255,255,255,0.85);
            }
            .profile-meta {
                display: grid;
                grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
                gap: 14px;
            }
            .meta-card {
                background: rgba(255,255,255,0.08);
                border-radius: 18px;
                padding: 20px;
            }
            .meta-title {
                margin: 0 0 10px 0;
                font-size: 12px;
                color: rgba(255,255,255,0.75);
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
            .meta-value {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
            }
            .progress-ring {
                width: 132px;
                height: 132px;
                margin: 0 auto 16px auto;
                border-radius: 50%;
                background: conic-gradient(#64d8ff 0deg, rgba(255,255,255,0.06) 0deg);
                display: grid;
                place-items: center;
                box-shadow: inset 0 0 18px rgba(100, 216, 255, 0.15);
                transition: background 320ms ease;
            }
            .progress-ring span {
                color: white;
                font-size: 28px;
                font-weight: 800;
            }
            .progress-text {
                margin: 0;
                color: rgba(255,255,255,0.72);
                font-size: 13px;
                line-height: 1.6;
            }
            .stats-row {
                display: grid;
                grid-template-columns: repeat(4, minmax(140px, 1fr));
                gap: 14px;
                margin-top: 22px;
            }
            .stat-card {
                background: rgba(12, 18, 40, 0.78);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 20px;
                padding: 22px 18px;
                text-align: center;
                box-shadow:
                    0 24px 45px rgba(0, 0, 0, 0.20),
                    inset 0 0 10px rgba(255,255,255,0.05);
                transition: transform 200ms ease, box-shadow 200ms ease;
            }
            .stat-card:hover {
                transform: translateY(-4px);
                box-shadow:
                    0 28px 55px rgba(0, 0, 0, 0.24),
                    inset 0 0 12px rgba(255,255,255,0.06);
            }
            .stat-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 42px;
                height: 42px;
                margin: 0 auto 12px;
                border-radius: 14px;
                background: rgba(100, 216, 255, 0.16);
                color: #7dd9ff;
                font-size: 18px;
            }
            .stat-title {
                margin: 0 0 8px 0;
                color: rgba(255,255,255,0.65);
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
            .stat-value {
                margin: 0;
                color: white;
                font-size: 22px;
                font-weight: 800;
            }
            .numeroNivel {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 72px;
                height: 72px;
                border-radius: 22px;
                background: rgba(255,255,255,0.09);
                color: white;
                font-size: 28px;
                font-weight: 800;
                border: 1px solid rgba(255,255,255,0.14);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            @media(max-width: 920px) {
                .profile-grid { grid-template-columns: 1fr; }
                .profile-top { flex-direction: column; }
                .profile-top-right { width: 100%; }
                .stats-row { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
            }
            @media(max-width: 620px) {
                .profile-grid { gap: 18px; }
                .stats-row { grid-template-columns: 1fr; }
                .profile-top-left,
                .profile-top-right { min-width: 100%; }
            }
        </style>

        <div class="profile-root">
            <div class="profile-header">
                <div>
                    <h1 class="profile-title">Perfil del jugador</h1>
                    <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.75);">Edita tu foto y revisa tus estadísticas.</p>
                </div>
                <button class="btn-back" id="btn-back">Volver</button>
            </div>

            <div class="profile-grid">
                <div class="profile-box">
                    <img id="preview" class="profile-preview" src="/assets/images/logo.png" alt="Perfil" />

                    <div class="file-group">
                        <label for="imagen">Cambiar foto de perfil</label>
                        <input id="imagen" class="file-input" type="file" accept="image/*" />
                    </div>
                </div>

                <div class="section">
                    <div class="profile-top">
                        <div class="profile-top-left profile-info-card">
                            <div class="profile-card">
                                <span class="profile-label">Nombre</span>
                                <p class="profile-value" id="nombreJugador">${player.nombre}</p>
                            </div>
                            <p class="profile-phrase">"${player.frase}"</p>
                        </div>
                        <div class="profile-top-right profile-id-card">
                            <span class="profile-label">ID</span>
                            <p class="profile-value" id="idJugador">${player.id}</p>
                        </div>
                    </div>

                    <div class="xp-section">
                        <div class="xp-header">
                            <div class="xp-badge">XP</div>
                            <span class="profile-label">Experiencia</span>
                        </div>
                        <div class="xp-bar">
                            <div class="xp"></div>
                        </div>
                        <div class="xp-meta">
                            <span>${player.xpActual} XP</span>
                            <span>${player.xpMaxima} XP</span>
                        </div>
                    </div>

                    <div class="profile-meta">
                        <div class="meta-card">
                            <p class="meta-title">Nivel</p>
                            <p class="meta-value numeroNivel" id="numeroNivel">${player.nivel}</p>
                        </div>
                        <div class="meta-card">
                            <p class="meta-title">Progreso general</p>
                            <div class="progress-ring">
                                <span>${xpPercent}%</span>
                            </div>
                            <p class="progress-text">Sigue así, estás en el camino correcto. ¡Cada batalla te hace más fuerte!</p>
                        </div>
                    </div>

                    <div class="stats-row">
                        <div class="stat-card">
                            <div class="stat-icon">⚔️</div>
                            <p class="stat-title">Batallas ganadas</p>
                            <p class="stat-value">${player.battlesWon || 128}</p>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🔥</div>
                            <p class="stat-title">Racha más larga</p>
                            <p class="stat-value">${player.longestStreak || 12}</p>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">⭐</div>
                            <p class="stat-title">Misiones completadas</p>
                            <p class="stat-value">${player.missionsCompleted || 243}</p>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🏆</div>
                            <p class="stat-title">Logros obtenidos</p>
                            <p class="stat-value">${player.achievements || 37}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        this.domUI = this.add.dom(0, 0).createFromHTML(html);
        this.domUI.setOrigin(0);
        this.domUI.setDepth(9999);

        this.domUI.node.style.position = 'absolute';
        this.domUI.node.style.left = '0';
        this.domUI.node.style.top = '0';
        this.domUI.node.style.width = width + 'px';
        this.domUI.node.style.height = height + 'px';

        const node = this.domUI.node;
        const imagen = node.querySelector('#imagen');
        const preview = node.querySelector('#preview');
        const btnBack = node.querySelector('#btn-back');
        const numeroNivel = node.querySelector('#numeroNivel');
        const xpBar = node.querySelector('.xp');
        const progressRing = node.querySelector('.progress-ring');
        const progressLabel = node.querySelector('.progress-ring span');

        if (xpBar) {
            xpBar.style.width = '0%';
            setTimeout(() => {
                xpBar.style.width = `${xpPercent}%`;
            }, 100);
        }

        if (progressRing && progressLabel) {
            const duration = 900;
            const start = performance.now();
            const target = xpPercent;

            const animateProgress = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const value = Math.round(target * eased);
                progressLabel.textContent = `${value}%`;
                progressRing.style.background = `conic-gradient(#64d8ff ${value * 3.6}deg, rgba(255,255,255,0.06) 0deg)`;

                if (progress < 1) {
                    requestAnimationFrame(animateProgress);
                }
            };

            requestAnimationFrame(animateProgress);
        }

        this.imageChangeListener = (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                if (preview) preview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        };

        if (imagen) imagen.addEventListener('change', this.imageChangeListener);

        this.backButtonListener = () => {
            this.scene.start('HomeScenes', { playerData: this.playerData });
        };

        if (btnBack) btnBack.addEventListener('click', this.backButtonListener);

        if (numeroNivel) {
            this.levelHoverIn = () => {
                numeroNivel.style.transform = 'scale(1.08)';
                numeroNivel.style.transition = '0.3s';
            };
            this.levelHoverOut = () => {
                numeroNivel.style.transform = 'scale(1)';
            };
            numeroNivel.addEventListener('mouseenter', this.levelHoverIn);
            numeroNivel.addEventListener('mouseleave', this.levelHoverOut);
        }

        this.glowInterval = setInterval(() => {
            if (!numeroNivel) return;
            numeroNivel.style.boxShadow = '0 0 40px gold';
            setTimeout(() => {
                if (!numeroNivel) return;
                numeroNivel.style.boxShadow = '0 0 20px gold';
            }, 500);
        }, 2000);

        this.scale.on('resize', this.onResize, this);
        this.events.on('shutdown', this.onShutdown, this);
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
        if (this.domUI && this.domUI.node) {
            const node = this.domUI.node;
            const imagen = node.querySelector('#imagen');
            const btnBack = node.querySelector('#btn-back');
            const numeroNivel = node.querySelector('#numeroNivel');

            if (imagen && this.imageChangeListener) imagen.removeEventListener('change', this.imageChangeListener);
            if (btnBack && this.backButtonListener) btnBack.removeEventListener('click', this.backButtonListener);
            if (numeroNivel) {
                if (this.levelHoverIn) numeroNivel.removeEventListener('mouseenter', this.levelHoverIn);
                if (this.levelHoverOut) numeroNivel.removeEventListener('mouseleave', this.levelHoverOut);
            }
        }
        if (this.glowInterval) {
            clearInterval(this.glowInterval);
            this.glowInterval = null;
        }
        this.scale.off('resize', this.onResize, this);
        if (this.domUI) {
            this.domUI.destroy();
            this.domUI = null;
        }
    }
}
