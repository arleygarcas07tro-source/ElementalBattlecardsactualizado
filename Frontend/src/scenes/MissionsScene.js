import Phaser from 'phaser';

const MISSIONS = [
    {
        id: 'primera-victoria',
        title: 'Primera victoria',
        desc: 'Gana tu primera batalla contra cualquier oponente.',
        progress: 0,
        target: 1,
        reward: '50',
        unit: 'gemas',
        icon: '⚔️'
    },
    {
        id: 'coleccionista',
        title: 'Coleccionista',
        desc: 'Coloca los 6 tipos elementales en tu campo en una misma partida.',
        progress: 0,
        target: 1,
        reward: '100',
        unit: 'gemas',
        icon: '💎'
    },
    {
        id: 'fusionador',
        title: 'Fusionador',
        desc: 'Realiza 5 fusiones de cartas iguales.',
        progress: 2,
        target: 5,
        reward: '150',
        unit: 'gemas',
        icon: '🔮'
    },
    {
        id: 'racha-victorias',
        title: 'Racha de victorias',
        desc: 'Gana 3 partidas consecutivas contra la IA.',
        progress: 1,
        target: 3,
        reward: '200',
        unit: 'gemas',
        icon: '🔥'
    },
    {
        id: 'aprendiz-elemental',
        title: 'Aprendiz elemental',
        desc: 'Ataca al menos una vez con cada uno de los 6 tipos elementales.',
        progress: 4,
        target: 6,
        reward: '120',
        unit: 'gemas',
        icon: '🌱'
    },
    {
        id: 'estratega',
        title: 'Estratega',
        desc: 'Gana una partida manteniendo una carta de nivel 3 en tu campo.',
        progress: 0,
        target: 1,
        reward: '250',
        unit: 'gemas',
        icon: '👑'
    }
];

export default class MissionsScene extends Phaser.Scene {
    constructor() {
        super('MissionsScene');
        this.playerData = null;
        this.backButtonListener = null;
    }

    init(data) {
        this.playerData = data.playerData || data || {};
    }

    create() {
        const { width, height } = this.scale;

        const missionsHtml = MISSIONS.map((mission, index) => {
            const percent = Math.min(100, Math.round((mission.progress / mission.target) * 100));
            const completed = mission.progress >= mission.target;

            return `
                <article class="mission-card ${completed ? 'is-done' : ''}">
                    <div class="mission-icon" style="--accent: ${this.accentFor(index)}">${mission.icon}</div>
                    <div class="mission-body">
                        <div class="mission-top">
                            <h3 class="mission-title">${mission.title}</h3>
                            <span class="mission-state">${completed ? 'Completada' : 'En progreso'}</span>
                        </div>
                        <p class="mission-desc">${mission.desc}</p>
                        <div class="mission-bar">
                            <div class="mission-fill" style="width: ${percent}%"></div>
                        </div>
                        <div class="mission-meta">
                            <span class="mission-counter">${Math.min(mission.progress, mission.target)} / ${mission.target}</span>
                            <span class="mission-reward">+${mission.reward} ${mission.unit}</span>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        const html = `
        <style>
            :host { box-sizing: border-box; }
            .missions-root {
                position: absolute;
                inset: 0;
                overflow: auto;
                color: white;
                font-family: Poppins, Arial, sans-serif;
                padding: 36px;
                background:
                    radial-gradient(1100px 520px at 15% 0%, rgba(138, 0, 255, 0.22), transparent 60%),
                    radial-gradient(900px 500px at 90% 100%, rgba(43, 143, 239, 0.18), transparent 55%),
                    linear-gradient(180deg, #0a0d1f 0%, #141030 100%);
            }
            .missions-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 20px;
                flex-wrap: wrap;
                margin-bottom: 30px;
            }
            .missions-title { margin: 0; font-size: 36px; letter-spacing: 0.04em; color: #F1E7BC; }
            .missions-subtitle { margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 15px; }
            .btn-back {
                appearance: none;
                border: 1px solid rgba(255,255,255,0.18);
                background: rgba(255,255,255,0.08);
                color: white;
                border-radius: 16px;
                padding: 14px 22px;
                font-size: 14px;
                cursor: pointer;
                box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
                transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
            }
            .btn-back:hover {
                background: rgba(255,255,255,0.16);
                transform: translateY(-2px);
            }
            .reward-strip {
                display: flex;
                align-items: center;
                gap: 10px;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 18px;
                padding: 14px 20px;
                max-width: 420px;
                box-shadow: 0 0 24px rgba(255, 215, 90, 0.08);
            }
            .reward-strip strong { color: #FFD75A; font-size: 15px; }
            .missions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
                gap: 18px;
            }
            .mission-card {
                display: flex;
                gap: 16px;
                background: rgba(12, 18, 40, 0.78);
                backdrop-filter: blur(14px);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 22px;
                padding: 20px;
                box-shadow: 0 18px 42px rgba(0, 0, 0, 0.3);
                transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
            }
            .mission-card:hover {
                transform: translateY(-4px);
                border-color: rgba(241, 231, 188, 0.35);
                box-shadow: 0 24px 52px rgba(0, 0, 0, 0.38);
            }
            .mission-card.is-done { border-color: rgba(255, 215, 90, 0.4); }
            .mission-icon {
                flex: 0 0 62px;
                height: 62px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                border-radius: 16px;
                background: linear-gradient(180deg, var(--accent), #141030);
                border: 1px solid rgba(255,255,255,0.15);
            }
            .mission-body { flex: 1; min-width: 0; }
            .mission-top {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: 10px;
            }
            .mission-title { margin: 0; font-size: 18px; color: #fff; }
            .mission-state {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: rgba(255,255,255,0.55);
            }
            .mission-card.is-done .mission-state { color: #FFD75A; }
            .mission-desc {
                margin: 8px 0 14px;
                color: rgba(255,255,255,0.72);
                font-size: 13.5px;
                line-height: 1.55;
            }
            .mission-bar {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.08);
                border-radius: 999px;
                overflow: hidden;
            }
            .mission-fill {
                height: 100%;
                border-radius: 999px;
                background: linear-gradient(90deg, #8a00ff, #5ce3ff);
                box-shadow: 0 0 14px rgba(92, 232, 255, 0.35);
                transition: width 700ms ease;
            }
            .mission-card.is-done .mission-fill { background: linear-gradient(90deg, #FFD75A, #E7A418); }
            .mission-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                margin-top: 10px;
                font-size: 13px;
            }
            .mission-counter { color: rgba(255,255,255,0.6); }
            .mission-reward {
                color: #FFD75A;
                font-weight: 700;
                background: rgba(255, 215, 90, 0.1);
                border: 1px solid rgba(255, 215, 90, 0.2);
                padding: 6px 12px;
                border-radius: 999px;
            }
            @media(max-width: 760px) {
                .missions-grid { grid-template-columns: 1fr; }
            }
        </style>

        <div class="missions-root">
            <div class="missions-header">
                <div>
                    <h1 class="missions-title">🎯 Misiones</h1>
                    <p class="missions-subtitle">Completa objetivos y gana recompensas para reforzar tu colección.</p>
                </div>
                <button class="btn-back" id="btn-back">Volver</button>
            </div>

            <div class="reward-strip">
                <span>💎</span>
                <strong>Gemas disponibles: 320</strong>
                <span style="opacity:0.7; font-size:13px;">· Canjea recompensas de misiones</span>
            </div>

            <div class="missions-grid">
                ${missionsHtml}
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
        const btnBack = node.querySelector('#btn-back');

        this.backButtonListener = () => {
            this.scene.start('HomeScenes', { playerData: this.playerData });
        };

        if (btnBack) btnBack.addEventListener('click', this.backButtonListener);

        this.scale.on('resize', this.onResize, this);
        this.events.on('shutdown', this.onShutdown, this);
    }

    accentFor(index) {
        const accents = ['#8a00ff', '#2b8fef', '#24d0ff', '#e04e2b', '#2be48a', '#ffd75a'];
        return accents[index % accents.length];
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
            const btnBack = node.querySelector('#btn-back');
            if (btnBack && this.backButtonListener) btnBack.removeEventListener('click', this.backButtonListener);
        }
        this.scale.off('resize', this.onResize, this);
        if (this.domUI) {
            this.domUI.destroy();
            this.domUI = null;
        }
    }
}